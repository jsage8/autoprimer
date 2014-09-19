#!/usr/bin/perl

=head1 NAME

load_gbk.pl - Loads selected annotation attributes from a Genbank flat file
and loads them into a Chado instance.

=head1 SYNOPSIS

USAGE: load_gbk.pl 
            --input_file=/path/to/some_file.gbk
            --database=abs2
            --user=someuser
          [ --password=somepass
            --server=localhost
            --log=/path/to/some.log ] 

=head1 OPTIONS

B<--input_file,-i>
    The path to a single GenBank flat file that can contain one or more entries. 

B<--database,-d>
    MySQL database name to connect to.

B<--user,-u>
    User account with select and insert privileges on the specified database.

B<--password,-p>
    Optional.  Password for user account specified.  

B<--server,-s>
    Optional.  Sybase server to connect to (default = localhost).

B<--log,-l> 
    Log file

B<--help,-h>
    This help message

=head1  DESCRIPTION


=head1  INPUT

Text here

=head1  OUTPUT

Text here

=head1  CONTACT

    Joshua Orvis
    jorvis@users.sf.net

=cut

use strict;
use Bio::SeqIO;
use DBI;
use Getopt::Long qw(:config no_ignore_case no_auto_abbrev pass_through);
use Pod::Usage;

my %options = ();
my $results = GetOptions (\%options, 
                          'input_file|i=s',
                          'database|d=s',
                          'user|u=s',
                          'password|p=s',
                          'server|s=s',
                          'log|l=s',
                          'help|h') || pod2usage();

## display documentation
if( $options{'help'} ){
    pod2usage( {-exitval => 0, -verbose => 2, -output => \*STDERR} );
}

## make sure everything passed was peachy
&check_parameters(\%options);

## open the log if requested
my $logfh;
if (defined $options{log}) {
    open($logfh, ">$options{log}") || die "can't create log file: $!";
}
_log("attempting to create database connection");
my $dbh = DBI->connect("dbi:mysql:database=$options{database};host=$options{server}", 
                        $options{user}, $options{password}, 
                        {PrintError=>1, RaiseError=>1});

##############################
## pre-cache data for better performance

## hashref like: $$h{gene} = 50;
my $cv_term_ids = load_cvterm_ids( qw(gene mRNA exon polypeptide assembly part_of 
                                      derives_from gene_product_name ) );

## hashref like: $$h{feature} = 1500;
my $next_ids = get_next_canonical_ids( qw(feature featureprop featureloc
                                          feature_relationship organism) );

##############################
##############################

_log("INFO: processing file: $options{input_file}");
my $seqio = Bio::SeqIO->new( -file => $options{input_file} );

## entry is a Bio::Seq::RichSeq
while ( my $entry = $seqio->next_seq ) {

    my $organism_id = organism_in_db( $entry->species->binomial );

    if ( ! $organism_id ) {
        $organism_id = add_organism( $entry->species );
    }

    my $molecule_accession = $entry->accession;
    my $molecule_length = length($entry->seq);
    my $molecule_feature_id = feature_in_db($molecule_accession);
    
    ## is this molecule stored already?
    if ( ! $molecule_feature_id ) {
        $molecule_feature_id = add_assembly( $entry, $organism_id );
    }
    
    _log("INFO: parsing annotation for accession: $molecule_accession");
    _log("INFO: molecule length ($molecule_length)");

    ## look through the features (Bio::SeqFeature::Generic)
    for my $feature ( $entry->get_SeqFeatures ) {

        ## skip it unless it's a CDS
        next if $feature->primary_tag ne 'CDS';

        my $feature_id;
        my $product = '';

        if ( $feature->has_tag('locus_tag') ) {
            $feature_id = ( $feature->get_tag_values('locus_tag') )[0];

        } elsif ( $feature->has_tag('protein_id') ) {
            $feature_id = ( $feature->get_tag_values('protein_id') )[0];

        } else {
            _logdie("found a CDS with no locus_tag or protein_id at position " . $feature->start);
        }

        if ( $feature->has_tag('product') ) {
            $product = ( $feature->get_tag_values('product') )[0];
        }

        my $translation = '';
        if ( $feature->has_tag('translation') ) {
            $translation = ($feature->get_tag_values('translation'))[0];

        ## no translation tag provided - let bioperl try        
        } else {
            $translation = $feature->seq->translate->seq();
        }

        if ( length $translation < 1 ) {
            _log("WARN: failed to get a translation for CDS $feature_id");
        }

        _log("INFO: adding CDS feature ($feature_id) with bioperl start (" . 
             $feature->start . "), end (" . 
             $feature->end . "), strand (" . $feature->strand . ")");

        #push @{$assemblies{$molecule_accession}}, {
        #    name => $feature_id,
        #    end5 => ($feature->strand == 1 ? $feature->start : $feature->end),
        #    end3 => ($feature->strand == 1 ? $feature->end : $feature->start),
        #    seq => $translation,
        #};
        
        ## insert each of the features in the graph, also locating them on their molecule
        my $gene_id = add_feature( $feature, 'gene', $organism_id, '', $feature_id, $molecule_feature_id );
        my $mRNA_id = add_feature( $feature, 'mRNA', $organism_id, '', $feature_id, $molecule_feature_id );
        my $exon_id = add_feature( $feature, 'exon', $organism_id, '', $feature_id, $molecule_feature_id );
        my $polypeptide_id = add_feature( $feature, 'polypeptide', $organism_id, $translation, $feature_id, $molecule_feature_id );
        
        ## define relationships between them
        ##  (these aren't well defined in the 'best practices guide'
        add_feature_relationship( $mRNA_id, 'derives_from', $gene_id );
        add_feature_relationship( $exon_id, 'part_of', $mRNA_id );
        add_feature_relationship( $polypeptide_id, 'derives_from', $exon_id );  ## non-spliced, proks only
        
        ## add properties
        add_featureprop( $polypeptide_id, 'gene_product_name', $product );
    }

}


## don't forget to close the door on your way out
$dbh->disconnect();

exit(0);


sub _log {
    my $msg = shift;

    print $logfh "$msg\n" if $logfh;
}

sub _logdie {
    my $msg = shift;

    print STDERR "\n$msg\n\n";
    _log($msg);
    exit(1);
}

sub add_assembly {
    my ($assembly, $org_id) = @_;
    
    my $qry = qq{
        INSERT INTO feature ( feature_id, organism_id, uniquename, residues, seqlen,
                              type_id, is_analysis, is_obsolete )
        VALUES ( ?, ?, ?, ?, ?, ?, 0, 0 )
    };
    my $assembly_inserter = $dbh->prepare($qry);
    
    my $assembly_id = $$next_ids{feature}++;
    

    $assembly_inserter->execute($assembly_id, $org_id, $assembly->accession, 
                                $assembly->seq, length($assembly->seq), 
                                $$cv_term_ids{assembly});
    
    $assembly_inserter->finish();
    
    return $assembly_id;
}

sub add_feature {
    my ($feature, $type, $org_id, $residues, $acc, $mol_id) = @_;
    
    my $qry = qq{
        INSERT INTO feature ( feature_id, organism_id, uniquename, residues, seqlen,
                              type_id, is_analysis, is_obsolete )
        VALUES ( ?, ?, ?, ?, ?, ?, 0, 0 )
    };
    my $feat_inserter = $dbh->prepare($qry);
    
    $qry = qq{
        INSERT INTO featureloc ( featureloc_id, feature_id, srcfeature_id, fmin, is_fmin_partial,
                                 fmax, is_fmax_partial, strand, locgroup, rank )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )
    };
    my $featloc_inserter = $dbh->prepare($qry);
    
    my $feat_id = $$next_ids{feature}++;

    $feat_inserter->execute( $feat_id, $org_id, $acc, $residues, 0, 
                             $$cv_term_ids{$type} );
    
    my $strand = -1;  ## possibly changed later
    my $fmin = $feature->start - 1;
    my $fmax = $feature->end;
    
    if ( $feature->strand == 1 ) {
        $strand = 1;   
    }
    
    $featloc_inserter->execute( $$next_ids{featureloc}++, $feat_id, $mol_id, $fmin, 0,
                                $fmax, 0, $strand, 0, 0 );
    
    $featloc_inserter->finish();
    $feat_inserter->finish();
    
    return $feat_id;
}

sub add_featureprop {
    my ($feat_id, $prop, $value) = @_;
    
    my $qry = qq{
        INSERT INTO featureprop (featureprop_id, feature_id, type_id, value, rank)
        VALUES (?, ?, ?, ?, 0)
    };
    my $prop_inserter = $dbh->prepare($qry);
       $prop_inserter->execute( $$next_ids{featureprop}++, $feat_id, $$cv_term_ids{$prop}, $value );
    
    $prop_inserter->finish();
}

sub add_feature_relationship {
    my ($subject_id, $verb, $object_id ) = @_;
    
    my $qry = qq{
        INSERT INTO feature_relationship ( feature_relationship_id, subject_id, object_id, type_id )
        VALUES ( ?, ?, ?, ? )
    };
    my $relationship_inserter = $dbh->prepare($qry);
       $relationship_inserter->execute( $$next_ids{feature_relationship}++, $subject_id, $object_id, $$cv_term_ids{$verb} );
       
    $relationship_inserter->finish();
}

sub add_organism {
    my $org = shift;
    
    my $qry = qq{
        INSERT INTO organism ( organism_id, genus, species, common_name )
        VALUES ( ?, ?, ?, ? )
    };
    my $org_inserter = $dbh->prepare($qry);
    
    my $org_id = $$next_ids{organism}++;

    $org_inserter->execute($org_id, $org->genus, $org->species, $org->binomial);
    
    $org_inserter->finish();
    
    return $org_id;
}

sub check_parameters {
    my $options = shift;
    
    ## make sure required arguments were passed
    my @required = qw( input_file database user );
    for my $option ( @required ) {
        unless  ( defined $$options{$option} ) {
            _logdie("--$option is a required option");
        }
    }
    
    ## prompt for the password if the user didn't enter it.
    if ( ! defined $options{password} ) {
        print STDERR "\nEnter MySQL password for user $options{user}: ";
        my $pass = <STDIN>;
        chomp $pass;
        $options{password} = $pass;
    }
    
    ## handle some defaults
    $options{server} = 'localhost' unless ( $options{server} );
}

## checks to see if the passed accession is already in the database
##  returns either the feature_id or 0
sub feature_in_db {
    my $accession = shift;
    
    my $qry = qq{
        SELECT feature_id
          FROM feature
         WHERE uniquename = ?
    };
    
    my $acc_selector = $dbh->prepare($qry);
       $acc_selector->execute($accession);
    
    my $feature_id = ( $acc_selector->fetchrow_array )[0] || 0;
    
    $acc_selector->finish();
    
    return $feature_id;
}


sub get_next_canonical_ids {
    my @table_names = @_;
    
    my %ids = ();
    
    for my $table_name ( @table_names ) {
        my $qry = qq{
            SELECT max(${table_name}_id)
              FROM $table_name
        };
        
        my $max_selector = $dbh->prepare($qry);
        $max_selector->execute();
    
        my $last_id = ( $max_selector->fetchrow_array )[0];

        ## the table must exist else the query will fail.  no need to check for that.
        ## if ID was set there was at least one row in the table.
        if ( $last_id ) {
            ## rows in the table - add 1
            $ids{$table_name} =  $last_id + 1;
        } else {
            ## no rows in the table, return 1
            $ids{$table_name} = 1;
        }
        
        $max_selector->finish();
    }
    
    return \%ids;
}


sub load_cvterm_ids {
    my @names = @_;
    my $qry = qq{
        SELECT cvterm_id
        FROM cvterm
        WHERE name = ?
    };
    
    my $cvterm_selector = $dbh->prepare($qry);
    
    my %terms = ();
    
    for my $name ( @names ) {
       $cvterm_selector->execute($name);
    
        my $cvterm_id = ( $cvterm_selector->fetchrow_array )[0];
        
        if ( $cvterm_id ) {
            _log("INFO: got cvterm_id $cvterm_id for name $name");
            $terms{$name} = $cvterm_id;
        } else {
            _logdie("ERROR: failed to retrieve cvterm_id for name $name");
        }
    }
    
    $cvterm_selector->finish();

    return \%terms;
}

## checks to see if the passed organism is already in the database
##  returns either the organism_id or 0
sub organism_in_db {
    my $binomial = shift;
    
    my $qry = qq{
        SELECT organism_id
          FROM organism
         WHERE common_name = ?
    };
    
    my $org_selector = $dbh->prepare($qry);
       $org_selector->execute($binomial);
    
    my $org_id = ( $org_selector->fetchrow_array )[0] || 0;
    
    $org_selector->finish();
    
    return $org_id;
}
