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
    modifications by Jonathan Sage
    jsage8 gmail com

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
                                      derives_from gene_product_name genomic_DNA ) );

##############################
##############################

_log("INFO: processing file: $options{input_file}");
my $seqio = Bio::SeqIO->new( -file => $options{input_file} );

## entry is a Bio::Seq::RichSeq
while ( my $entry = $seqio->next_seq ) {
	add_genomic( $entry );
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

sub add_genomic {
    my ($genomic) = @_;
    
    my $qry = qq{
        INSERT INTO feature ( feature_id, organism_id, uniquename, residues, seqlen,
                              type_id, is_analysis, is_obsolete )
        VALUES ( ?, ?, ?, ?, ?, ?, 0, 0 )
    };
    my $genomic_inserter = $dbh->prepare($qry);

    $genomic_inserter->execute(16802, 1, $genomic->accession, 
                                $genomic->seq, length($genomic->seq), 
                                $$cv_term_ids{genomic_DNA});
    
    $genomic_inserter->finish();
}
