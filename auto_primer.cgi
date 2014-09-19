#!/usr/bin/perl -w

################################################################################
#       auto_primer.cgi
################################################################################  
#     
#       Copyright 2013 Jonathan Sage 
#       
#       This program is free software; you can redistribute it and/or modify
#       it under the terms of the GNU General Public License as published by
#       the Free Software Foundation; either version 2 of the License, or
#       (at your option) any later version.
#       
#       This program is distributed in the hope that it will be useful,
#       but WITHOUT ANY WARRANTY; without even the implied warranty of
#       MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#       GNU General Public License for more details.
#       
#       For a copy of the GNU General Public License, write to 
#		The Free Software Foundation, Inc., 
#		51 Franklin Street, Fifth Floor, Boston,
#       MA 02110-1301, USA.
#
################################################################################
#
# 		NAME OF THE PROGRAM: auto_primer.cgi
# 		DATE: 05/07/2013
# 		AUTHOR: Jonathan Sage
#		CONTACT: jsage8  gmail  com
# 		COMMENTS: See HTML Documentation
#
################################################################################

use strict;
use CGI;
use Config::IniFiles;
use DBI;
use JSON;

#for diagnostic purposes
#open(LOGFILE, ">>logfile.txt");
#print(LOGFILE "test\n");

## create our CGI and TMPL objects
my $cgi  = new CGI;

my $cfg = Config::IniFiles->new( -file => "settings.ini" ) || die "failed to read INI file: $!";

my $dsn = "DBI:mysql:database=" . $cfg->val('database', 'name') . 
                       ";host=" . $cfg->val('database', 'server') . ";";

my $dbh = DBI->connect($dsn, $cfg->val('database', 'user'), $cfg->val('database', 'pass'),
                       {RaiseError => 1, PrintError => 0});

my $json = JSON->new->utf8->allow_nonref;

my $term;
my $maxRows;
my $autoTerm;
my $refineTerm;
my $fivePrimePrimer;
my $threePrimePrimer;
my $organismID;

my $isPrimer = 0;

## initialize an empty arrayref to store the search matches
my $matches = [];
my $five_prime_matches = [];
my $three_prime_matches = [];
my $qry;
my $dsh;

$term = $cgi->param('search_term');
$maxRows = $cgi->param('maxRows');
$autoTerm = $cgi->param('productName');
$refineTerm = $cgi->param('refine_term');
$fivePrimePrimer = $cgi->param('five_prime_primer');
$threePrimePrimer = $cgi->param('three_prime_primer');
$organismID = $cgi->param('organism_id');

if(defined($term)){
	#Basic search of the database
	
	$qry = qq{
		SELECT f.uniquename AS protein_accession, product.value AS protein_name
		FROM feature f
		JOIN featureprop product ON f.feature_id=product.feature_id
		JOIN cvterm productprop ON product.type_id=productprop.cvterm_id
		WHERE productprop.name = ?
		AND product.value LIKE ?
	};

	$dsh = $dbh->prepare($qry);
	
	$dsh->execute('gene_product_name', "\%$term\%");
	
	while (my $row = $dsh->fetchrow_hashref) {
		## push the row to the match array
		push @$matches, $row;
	}
}
elsif(defined($refineTerm)){
	#Refined search of the database for a specific product
	my $beforeContext = $cgi->param('before_context');
	my $afterContext = $cgi->param('after_context');
	
	if(not defined($beforeContext) || not $beforeContext=~/^(\d+)$/ || $beforeContext < 0) {
		$beforeContext = 0;
	}
	if(not defined($afterContext) || not $beforeContext=~/^(\d+)$/ || $afterContext < 0) {
		$afterContext = 0;
	}
	
	$qry = qq{
		SELECT f.uniquename AS protein_accession, product.value AS protein_name, 
			SUBSTRING(srcfeature.residues, location.fmin + 1, location.fmax - location.fmin) AS residue_sequence, 
			SUBSTRING(srcfeature.residues, location.fmin - (? - 1), ?) AS before_sequence,
			SUBSTRING(srcfeature.residues, location.fmax - 1, ?) AS after_sequence,
			srcassembly.name AS source_type, location.fmin AS location_min, location.fmax AS location_max, 
			location.strand AS strand, org.common_name AS organism, org.organism_id AS organism_id
		FROM feature f
		JOIN cvterm polypeptide ON f.type_id=polypeptide.cvterm_id
		JOIN featureprop product ON f.feature_id=product.feature_id
		JOIN cvterm productprop ON product.type_id=productprop.cvterm_id
		JOIN featureloc location ON f.feature_id=location.feature_id
		JOIN feature srcfeature ON location.srcfeature_id=srcfeature.feature_id
		JOIN cvterm srcassembly ON srcfeature.type_id=srcassembly.cvterm_id
		JOIN organism org ON f.organism_id=org.organism_id
		WHERE polypeptide.name = ?
		AND productprop.name = ?
		AND f.uniquename = ?
	};

	$dsh = $dbh->prepare($qry);
	
	$dsh->execute("$beforeContext", "$beforeContext", "$afterContext", 'polypeptide', 'gene_product_name', "$refineTerm");
	
	while (my $row = $dsh->fetchrow_hashref) {
		## push the row to the match array
		push @$matches, $row;
	}
	
	
	
}
elsif(defined($fivePrimePrimer) && defined($threePrimePrimer)) {
	#This is a very basic search for non-specific binding. This algorithm
	#could be improved by adding k-mer searching of the database.
	
	$isPrimer = 1;
	
	#Generate reverse complement primers for checking the opposite strand
	my $fivePrimeComplement = reverse($fivePrimePrimer);
	$fivePrimeComplement =~ tr/ATCG/TAGC/;
	my $threePrimeComplement = reverse($threePrimePrimer);
	$threePrimeComplement =~ tr/ATCG/TAGC/;

	#~ $qry = qq{
		#~ SELECT f.uniquename AS protein_accession
		#~ FROM feature f
		#~ JOIN cvterm polypeptide ON f.type_id=polypeptide.cvterm_id
		#~ JOIN featureprop product ON f.feature_id=product.feature_id
		#~ JOIN cvterm productprop ON product.type_id=productprop.cvterm_id
		#~ JOIN featureloc location ON f.feature_id=location.feature_id
		#~ JOIN feature srcfeature ON location.srcfeature_id=srcfeature.feature_id
		#~ JOIN cvterm srcassembly ON srcfeature.type_id=srcassembly.cvterm_id
		#~ WHERE SUBSTRING(srcfeature.residues, location.fmin + 1, location.fmax - location.fmin) like ?
	#~ };

	$qry = qq{
		SELECT f.uniquename AS genome_accession
		FROM feature f
		JOIN cvterm genomic ON f.type_id=genomic.cvterm_id
		WHERE f.organism_id = ?
		AND genomic.name = ?
		AND f.residues LIKE ?
	};
	
	$dsh = $dbh->prepare($qry);
	
	#Check to see if the 5' primer binds on the forward strand
	$dsh->execute("$organismID", 'genomic_DNA', "\%$fivePrimePrimer\%$fivePrimePrimer\%");
	
	while (my $row = $dsh->fetchrow_hashref) {
		## push the row to the match array
		push @$five_prime_matches, $row;
	}
	
	#Check to see if the 5' primer binds on the reverse strand
	$dsh->execute("$organismID", 'genomic_DNA', "\%$fivePrimeComplement\%");
	
	while (my $row = $dsh->fetchrow_hashref) {
		## push the row to the match array
		push @$five_prime_matches, $row;
	}
	
	#Check to see if the 3' primer binds on the forward strand
	$dsh->execute("$organismID", 'genomic_DNA', "\%$threePrimePrimer\%");
	
	while (my $row = $dsh->fetchrow_hashref) {
		## push the row to the match array
		push @$three_prime_matches, $row;
	}
	
	#Check to see if the 5' primer binds on the reverse strand
	$dsh->execute("$organismID", 'genomic_DNA', "\%$threePrimeComplement\%$threePrimeComplement\%");
	
	while (my $row = $dsh->fetchrow_hashref) {
		## push the row to the match array
		push @$three_prime_matches, $row;
	}
	
	
	
	
	#~ $dsh = $dbh->prepare($qry);
	#~ 
	#~ #Check to see if the 5' primer binds on the forward strand
	#~ $dsh->execute("\%$fivePrimePrimer\%");
	#~ 
	#~ while (my $row = $dsh->fetchrow_hashref) {
		#~ ## push the row to the match array
		#~ push @$five_prime_matches, $row;
	#~ }
	#~ 
	#~ #Check to see if the 5' primer binds on the reverse strand
	#~ #This is always incorrect binding
	#~ $dsh->execute("\%$fivePrimeComplement\%");
	#~ 
	#~ while (my $row = $dsh->fetchrow_hashref) {
		#~ ## push the row to the match array
		#~ push @$five_prime_matches, $row;
	#~ }
	#~ 
	#~ #Check to see if the 3' primer binds on the forward strand
	#~ #This is always incorrect binding
	#~ $dsh->execute("\%$threePrimePrimer\%");
	#~ 
	#~ while (my $row = $dsh->fetchrow_hashref) {
		#~ ## push the row to the match array
		#~ push @$three_prime_matches, $row;
	#~ }
	#~ 
	#~ #Check to see if the 3' primer binds on the reverse strand
	#~ $dsh->execute("\%$threePrimeComplement\%");
	#~ 
	#~ while (my $row = $dsh->fetchrow_hashref) {
		#~ ## push the row to the match array
		#~ push @$three_prime_matches, $row;
	#~ }
}
else{
	#Autocomplete search of the database for <5 similar products
	$qry = qq{
		SELECT product.value AS protein_name
		FROM feature f
		JOIN featureprop product ON f.feature_id=product.feature_id
		JOIN cvterm productprop ON product.type_id=productprop.cvterm_id
		WHERE productprop.name = ?
		AND product.value like ?
	};

	$dsh = $dbh->prepare($qry);
	
	$dsh->execute('gene_product_name', "\%$autoTerm\%");
	
	for(my $i = 0; $i < $maxRows && defined(my $row = $dsh->fetchrow_hashref); $i++) {
		## push the row to the match array
		push @$matches, $row;
	}
}

$dsh->finish;
$dbh->disconnect;

#for diagnostic purposes
#close LOGFILE;

## print the header and JSON data
print $cgi->header('application/json');
if($isPrimer) {
	print $json->encode(
		{ five_prime_count => scalar( @$five_prime_matches ), three_prime_count => scalar( @$three_prime_matches ) }
	);
}
else {
	print $json->encode(
		{ match_count => scalar( @$matches ), matches => $matches }
	);
}
