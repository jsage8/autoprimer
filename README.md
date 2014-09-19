autoprimer
==========

Advanced Computer Concepts in Bioinformatics at JHU - Primer Design LAMP Stack

************************************************************************
* AUTHOR INFORMATION

  Author: Jonathan Sage
  
  Contact: jsage8 gmail com
  
  Last Update: 5/7/2013

************************************************************************
* ABOUT

  Auto Primer assists in the selection of primers for molecular cloning. 
  After the user selects a target, Auto Primer automatically designs the 
  5' and 3' primers to target the beginning and end of the gene. The 
  amplified region will be high-lighted to clearly denote the amplicon.
  
  Beyond automatically targeting the gene, the primers are fully 
  customizable to allow moving them up and downstream of the gene to 
  amplify the surrounding context. The amount of context shown can also be 
  increased in case the user needs to amplify promoter regions or other 
  important features outside of the gene context. Additionally, primers 
  may be lengthened or shortened as desired.
  
  Once the desired positions and lengths have been set by the user, the 
  primers will be printed out in 5' to 3' format in a text box for easy 
  copying. At this point the user can also elect to check the primers for 
  specificity by analyzing the primers. Primers that are too short may 
  risk multiple binding sites and should be avoided.

************************************************************************
* LINKS AND SOURCE CODE

Full Project Archive:
	
	Link:
	N/A
	
	Size:
	10,321,920 bytes (10.3 mb)
	
	Core Code:
	auto_primer.cgi			**server side script - processes SQL queries
	auto_primer.html		**markup document
	css/auto_primer.css		**style sheet
	js/search.js			**client side script - user input & display
	
	Access Info:
	settings.ini			**SQL login credentials
	
	Supplemental Code:
	load_gbk.pl				**Author Joshua Orvis - loads SQL database
	load_genomic.pl			**Author Joshua Orvis - modification 
	                        **    loads genomic DNA into SQL database
	
	Sequence File:
	e_coli_k12_dh10b.gbk	**Genbank file with annotated genome info
	
	Log File:
	logfile.txt				**For diagnostic purposes only

Active URL:
	N/A
	
Other Dependencies:
	None
	
************************************************************************
* RECONSTITUTE THIS PROJECT

This project uses a LAMP stack and therefore requires some setup to 
reconstitute. The project requires that you have installed Apache Server
2.0, MySQL Server, and Perl. 

************************************************************************
* QUICK GUIDE

1. Type a gene product term into the search box and press the 'search' 
	button.
	
2. From the results select a single product and press the 
	'refine search' button.
	
3. Alter primers as desired using the customize section and press the 
	'customize' button.
	
4. Check primers for non-specific binding by pressing the 
	'analyze primers' button.
	
5. Copy primers from the primers section and order; that's it.

************************************************************************
* FULL DOCUMENTATION

To Begin
Start typing a gene product into the search box. Auto Primer will 
autocomplete your query to fill the field. Press the 'search' button to 
retrieve hits for that protein product from the database.

The search results will be displayed in a table. Each row will have a 
radio button in the first column. Selecting one of the radio buttons and 
pressing 'refine search' will bring up the genomic DNA sequence for that 
specific product.

Gene Display
Genes may be present on either strand of the genomic sequence, viewing 
just the raw genomic sequence would cause genes present on the -1 strand 
to appear backwards. Auto Primer automatically takes genes from the -1 
strand and produces a reverse complement before displaying. In the Gene 
of Interest section, the gene will be displayed as double stranded 
sequence showing both the coding strand and the complementary strand. 
Due to Auto Primer's correction for the -1 strand, the coding strand is 
always the top strand and the complementary strand is always the bottom 
strand. This should dramatically reduce directional confusion for those 
new to PCR.

The context before and after the gene will also be displayed. These 
sequences are presented in light gray to indicate they are not part of 
the gene. However, many users may find it useful to amplify regions 
outside of the gene context, e.g. promoter region and TATA box.

Amplicon
Primers will automatically be selected and marked on the DNA using red 
and green high-lighting. Any region between the primers will also be 
high-lighted yellow to indicate it is part of the amplicon. If no 
customization is necessary, the user may elect to just analyze the 
primers for specificity. If no warnings arise, then the primers are 
ready for purchasing and may easily be copied out with 5' and 3' 
annotation already attached.

If warnings arise, or further customization is desired, simply alter 
the gene context, primer length, and primer start positions using the 
Customization form. Be aware that the 3' primer start position is 
actually the position where it appears to end. This is because DNA 
is always considered in the 5' to 3' direction. If it helps, think of 
the 5' and 3' primer start positions as the positions where 
amplification stops.

Lengthening a primer is the best way to improve its specificity without 
having to change the amplicon. If the primer analysis indicates that 
non-specific binding will occur, consider lengthening that primer. 
Avoid unnecessarily long primers. Primers that are too long will cost 
more and take longer to anneal without any benefit to amplification.

Note that the end of the 5' or 3' primer is not allowed to overlap the 
start of the 3' or 5' primer, respectively. The start of the 5' or 3' 
primer is also not allowed to be downstream or upstream from the end of 
the 3' or 5' primer end, respectively. In effect, this prevents the 3' 
primer from ever being upstream of the 5' primer which would cause the 
PCR to fail.

Note that amplicons longer than 2kb may be difficult to amplify using 
standard PCR. In the event that a longer amplicon is necessary consider 
purchasing a Phusion polymerase based PCR kit.

Primer Analysis
Once the desired amplicon has been selected through customization or 
automation, the primers should be checked for specificity. In the 
Primers section press the 'analyze primers' button to run a database 
search for non-specific binding sites. If the primer is unique it will 
be marked successful. If the primer has additional binding sites it will 
be marked with a warning.

************************************************************************
* FEATURE DEMONSTRATION

Autocomplete
Simply type something at the search input and this feature should be
readily apparent.

Client-side and Server-side in the Same Form
The customize form uses client-side updates to the UI for everything
except changing the before and after context. Making changes to these 
form fields will produce a rapid update of the UI which should have
almost no delay. In contrast, changing the before and after context
requires a server-side query of the database. While this query is fast,
it still produces a noticable delay in the update of the UI. If you 
update the before or after context, but then leave them unchanged to 
perform additional manipulations to the primers, all code will be run 
client-side.

Form Input Filtering
Try typing alphabet characters into the customize form. You will find 
that the code simply discards the input and reverts to the old approved
value.

Overlapping Display Styles
Display a gene. In the customize interface change the 5' primer start
position from 100 to 90. Notice that the primer (green high-lighting) 
can straddle both the gene context (black text) and the before gene 
context (gray text). This may seem trivial, but it was not easy to 
implement. As another example, display a fresh gene. In the customize
interface change the 5' primer length to the same value as the 3' primer
start position minus 100. Notice that the 5' primer can extend all the 
way to overlap the 3' primer without any display issues.

Positioning the Primers Without Regard for the Principles of PCR
Try positioning the 5' primer downstream from the 3' primer. There 
should be a Javascript alert message that the primer is out of bounds 
and the display will fail to render. Try positioning one of the primers 
off of the shown context. You will also receive an alert and the display
will fail to render. Attempting any other primer positions that would
preclude the formation of an amplicon are also disallowed and will
produce the same result.

Primer Specificity
The automatically selected primers will almost always be unique as they 
are 24 nucleotides long. In order to demonstrate that primers are 
checked for specificity, try shortening the length of one of the primers
in the customization area. Once the primer has been shortened, analyze
the primers again. I found that a length of <12 was necessary to produce
non-specific primers.

Reverse Complement of -1 Strand Genes
Finding a -1 strand gene isn't that hard at random, since there are a 
lot of them. However, if you'd rather not hunt for one, type in 
'bifunctional' into the search input and press 'search'. Select the 6th
radio button and press 'refine search'. The gene selected should be from
the -1 strand. Note that the 5' primer starts with the gene start codon
sequence ATG.

All other features not listed here should be readily apparent with
normal use.








