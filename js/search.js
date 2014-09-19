/***********************************************************************
 *  search.js
 ***********************************************************************
 * Copyright 2013 Jonathan Sage
 *      
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * For a copy of the GNU General Public License, write to 
 * The Free Software Foundation, Inc., 
 * 51 Franklin Street, Fifth Floor, Boston,
 * MA 02110-1301, USA.
 * 
 ***********************************************************************
 * 
 * NAME OF THE PROGRAM: search.js
 * DATE: 05/07/2013
 * AUTHOR: Jonathan Sage
 * CONTACT: jsage8  gmail  com
 * COMMENTS: See HTML Documentation
 *  
 **********************************************************************/

/**********************************************************************
 * runSearch()
 **********************************************************************
 * Passes search parameters via AJAX to the .cgi script
 **********************************************************************/
function runSearch() {
    // hide, clear, and reset defaults for the previous user inputs
    $('#results').hide();
    $('#output').hide();
    $('#primers').hide();
    $('#search_tbody').empty();
    $('#gene_tbody').empty();
    $('#five_prime_analysis').empty();
	$('#three_prime_analysis').empty();
	$('#data_div').data("before_context", 100);
	$('#data_div').data("after_context", 100);
	$('#data_div').data("five_prime_start", null);
	$('#data_div').data("three_prime_start", null);
	$('#data_div').data("five_prime_length", 24);
	$('#data_div').data("three_prime_length", 24);
    
    if($('#search_term').isEmpty()) {
		//Do Nothing Empty Query
	}
	else {
		// transforms form parameters into standard URL-encoded string
		var paramStr = $('#gene_search').serialize();
		
		$.ajax({
			url: './auto_primer.cgi',
			dataType: 'json',
			data: paramStr,
			success: function(data, textStatus, jqXHR) {
				processJSON(data);
			},
			error: function(jqXHR, textStatus, errorThrown){
				alert("Failed to perform gene search! textStatus: (" + textStatus +
					  ") and errorThrown: (" + errorThrown + ")");
			}
		});
	}
}

/**********************************************************************
 * autoFill()
 **********************************************************************
 * Passes search parameters via AJAX to the .cgi script. Gives 
 * suggestions via .autocomplete to the search input.
 **********************************************************************/
function autoFill() {
	$( "#search_term" ).autocomplete({
		source: function( request, response ) {
			
			// create a parameter string that contains max rows to 
			// display and the product name
			var maxRows = 5;
			var productName = request.term;
			var paramStr = "maxRows=" + maxRows + "&productName=" + productName;
			$.ajax({
				url: './auto_primer.cgi',
				dataType: 'json',
				data: paramStr,
				contentType: 'application/json; charset=utf-8',
				success: function( data ) {
					response( $.map( data.matches, function( item ) {
						return {
							label: item.protein_name,
							value: item.protein_name
						}
					}));
				}
			});
		},
		minLength: 2,
		open: function() {
			$( this ).removeClass( "ui-corner-all" ).addClass( "ui-corner-top" );
		},
		close: function() {
			$( this ).removeClass( "ui-corner-top" ).addClass( "ui-corner-all" );
		}
	});
}

/**********************************************************************
 * refineSearch()
 **********************************************************************
 * Passes search parameters via AJAX to the .cgi script. Takes a single
 * protein accession from the form output made by processJSON() and adds
 * before and after context length that are stored in data_div.
 **********************************************************************/
function refineSearch() {
	// hide the previous results
    $('#results').hide();
    
    // load before and after context parameters from data_div using .data()
	var beforeContext = $('#data_div').data("before_context");
	var afterContext = $('#data_div').data("after_context");
	
	// transforms form parameters into standard URL-encoded string
	// appends additional before and after context parameters from data_div
	// note that refine search uses the protein accession, not the protein name
    var paramStr = $('#refine_search').serialize();
    var paramStr = paramStr + "&before_context=" + beforeContext + "&after_context=" + afterContext;
    
    $.ajax({
        url: './auto_primer.cgi',
        dataType: 'json',
        data: paramStr,
        success: function(data, textStatus, jqXHR) {
            updateUI(data);
        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("Failed to perform gene search! textStatus: (" + textStatus +
                  ") and errorThrown: (" + errorThrown + ")");
        }
    });
    
    // clear the previous results
    // note this must be done at the end of the function or it will
    // clear the values of the inputs that are being .serialized()
    $('tbody').empty();
}

/**********************************************************************
 * customizeSearch()
 **********************************************************************
 * This function processes user modifications. If the before or after
 * context is altered it passes search parameters via AJAX to the 
 * .cgi script and then processes the changes in updateUI().
 * Additionally, if the other parameters are changed they are written to
 * data_div and then updateUI() is passed null and it loads
 * the saved values from data_div. This allows multiple methods to
 * access these values without needing to pass them constantly. If no
 * changes are made to the context the modifications are done client-
 * side only. 
 **********************************************************************/
function customizeSearch() {
	// clear the previous gene info and sequence info
	$('#gene_tbody').empty();
	$('#sequence_tbody').empty();
	$('#five_prime_primer').empty();
	$('#three_prime_primer').empty();
	$('#five_prime_analysis').empty();
	$('#three_prime_analysis').empty();
	
	// declare temp variables for holding form input and initialize them to null
	var beforeContextTemp = null;
	var afterContextTemp = null;
	var fivePrimeLengthTemp = null;
	var threePrimeLengtTemp = null;
	var fivePrimeStartTemp = null;
	var threePrimeStartTemp = null;
	
	// if true all modifications are done client side
	var clientSideControl = true;
	
	// retrieve all necessary data from data_div using .data()
	var beforeContext = $('#data_div').data("before_context");
	var afterContext = $('#data_div').data("after_context");
	var fivePrimeLength = $('#data_div').data("five_prime_length");
	var threePrimeLength = $('#data_div').data("three_prime_length");
	var fivePrimeStart = $('#data_div').data("five_prime_start");
	var threePrimeStart = $('#data_div').data("three_prime_start");
	var proteinAccession = $('#data_div').data("protein_accession");
	var beforeSequence = $('#data_div').data("before_sequence");
	var geneSequence = $('#data_div').data("gene_sequence");
	var afterSequence = $('#data_div').data("after_sequence");
	var strand = $('#data_div').data("strand");
	
	// check to see if the user has changed after context to a new number
	if(!$('#after_context').isEmpty() && isNaN($('#after_context'))) {
		afterContextTemp = $('#after_context').val();
		if(afterContextTemp != afterContext && afterContextTemp > 0) {
			afterContext = afterContextTemp;
			$('#data_div').data("after_context", afterContext);
			clientSideControl = false;
		}
	}
	// check to see if the user has changed the length of the 5' primer to a new number
	if(!$('#five_prime_length').isEmpty() && isNaN($('#five_prime_length'))) {
		fivePrimeLengthTemp = $('#five_prime_length').val();
		if(fivePrimeLengthTemp != fivePrimeLength) {
			fivePrimeLength = fivePrimeLengthTemp;
			$('#data_div').data("five_prime_length", fivePrimeLength);
		}
	}
	// check to see if the user has changed the length of the 3' primer to a new number
	if(!$('#three_prime_length').isEmpty() && isNaN($('#three_prime_length'))) {
		threePrimeLengthTemp = $('#three_prime_length').val();
		if(threePrimeLengthTemp != threePrimeLength) {
			threePrimeLength = threePrimeLengthTemp;
			$('#data_div').data("three_prime_length", threePrimeLength);
		}
	}
	// check to see if the user has changed the start location for the 5' primer to a new number
	if(!$('#five_prime_start').isEmpty() && isNaN($('#five_prime_start'))) {
		fivePrimeStartTemp = $('#five_prime_start').val();
		if(fivePrimeStartTemp != fivePrimeStart) {
			fivePrimeStart = fivePrimeStartTemp;
			$('#data_div').data("five_prime_start", fivePrimeStart);
		}
	}
	// check to see if the user has changed the start location for the 3' primer to a new number
	if(!$('#three_prime_start').isEmpty() && isNaN($('#three_prime_start'))) {
		threePrimeStartTemp = $('#three_prime_start').val();
		if(threePrimeStartTemp != threePrimeStart) {
			threePrimeStart = threePrimeStartTemp;
			$('#data_div').data("three_prime_start", threePrimeStart);
		}
	}
	// check to see if the user has changed before context to a new number
	// if they have the locations of the 5' and 3' primers will be adjusted as well
	if(!$('#before_context').isEmpty() && isNaN($('#before_context'))) {
		beforeContextTemp = $('#before_context').val();
		if(beforeContextTemp != beforeContext && beforeContextTemp > 0) {
			fivePrimeStart = fivePrimeStart - (beforeContext - beforeContextTemp);
			threePrimeStart = threePrimeStart - (beforeContext - beforeContextTemp);
			$('#data_div').data("five_prime_start", fivePrimeStart);
			$('#data_div').data("three_prime_start", threePrimeStart);
			beforeContext = beforeContextTemp;
			$('#data_div').data("before_context", beforeContext);

			clientSideControl = false;
		}
	}

	// update the browser from the client side
	if(clientSideControl) {
		// pass updateUI function a null value so that it does
		// not attempt to process unavailable JSON data
		var data = null;
		updateUI(data);
	}
	// update the browser from the server side
	else {
		// transforms form parameters into standard URL-encoded string
		// if the strand is -1 retrieve the before context as if it were
		// the after context and vice versa (the reverse complement of
		// the gene has been displayed to make it easier for the user)
		if(strand > 0) {
			var paramStr = "before_context=" + beforeContext +
				"&after_context=" + afterContext + "&refine_term=" + proteinAccession;
		}
		else {
			var paramStr = "before_context=" + afterContext + 
				"&after_context=" + beforeContext + "&refine_term=" + proteinAccession;
		}
		
		$.ajax({
			url: './auto_primer.cgi',
			dataType: 'json',
			data: paramStr,
			success: function(data, textStatus, jqXHR) {
				updateUI(data);
			},
			error: function(jqXHR, textStatus, errorThrown){
				alert("Failed to perform gene search! textStatus: (" + textStatus +
					  ") and errorThrown: (" + errorThrown + ")");
			}
		});
	}
}

/**********************************************************************
 * analyzePrimers()
 **********************************************************************
 * 
 **********************************************************************/
function analyzePrimers() {
	// clear the previous primer analysis
	$('#five_prime_analysis').empty();
	$('#three_prime_analysis').empty();
	
	// retrieve all necessary data from data_div using .data()
	var fivePrimeString = $('#data_div').data("five_prime_primer");
	var threePrimeString = $('#data_div').data("three_prime_primer");
	var organismID = $('#data_div').data("organism_id");
	
	var paramStr = "five_prime_primer=" + fivePrimeString + "&three_prime_primer=" + threePrimeString + "&organism_id=" + organismID;

	// transforms primer data into standard URL-encoded string
	
	// does it matter if strand is -1 ???
	
	$.ajax({
		url: './auto_primer.cgi',
		dataType: 'json',
		data: paramStr,
		success: function(data, textStatus, jqXHR) {
			primerAnalysis(data);
		},
		error: function(jqXHR, textStatus, errorThrown){
			alert("Failed to perform gene search! textStatus: (" + textStatus +
				  ") and errorThrown: (" + errorThrown + ")");
		}
	});
}

/**********************************************************************
 * processJSON()
 **********************************************************************
 * Processes passed JSON structure representing product matches. It then
 * outputs a tabular form containing the search results. Radio buttons
 * are displayed next to each search result and the user can refine
 * their search further.
 **********************************************************************/
function processJSON( data ) {
    // set the span that lists the match count
    $('#match_count').text( data.match_count );
    
    // this will be used to keep track of row identifiers
    var rowNum = 1;
    
    // iterate over each match and add a row to the result table for each
    $.each( data.matches, function(i, item) {
        var thisRowId = 'result_row_' + rowNum;
        //optimized to one call to append to the DOM per row.
		$('<label/>', { "text" : rowNum, "for" : item.protein_accession } )
			.add($('<input/>', { "value" : item.protein_accession, "id" : item.protein_accession, "name": "refine_term", "type": "radio" } ))
			.wrapAll('<td class="radio"/>').parent().add($('<td/>', { "text" : item.protein_accession } ))
			.add($('<td/>', { "text" : item.protein_name } ))
			.wrapAll($('<tr/>', { "id": thisRowId } )).parent().appendTo('#search_tbody');		
		rowNum++;
    });
    
    // show the result section that was previously hidden
    $('#results').show();
}

/**********************************************************************
 * updateUI()
 **********************************************************************
 * This function updates the UI after a refined search is performed
 * or the user makes customizations to the output. The passed parameter
 * data can either contain JSON data from a server-side script, or it
 * can contain null if the user made customizations that didn't require
 * server-side processing. It retrieves data stored in data_div using
 * the .data() method and these values are used to process the sequence.
 * 
 * The sequence is broken up into arrays for styling and then broken
 * up further to print 100 characters per line. See detailed comments
 * inside this function for more information on styling.
 **********************************************************************/
function updateUI( data ) {
	// declare gene variables 
	var proteinAccession;
	var proteinName;
	var locationMin;
	var locationMax;
	var strand;
	var organism;
	var organismID;
	var beforeSequence;
	var geneSequence;
	var afterSequence;
	
	// declare primer and user input variables
	var fivePrimeStart;
	var threePrimeStart;
	var beforeContext;
	var afterContext;
	var fivePrimeLength;
	var threePrimeLength;
	
	if(data != null) {
		// retrieve sequence strings from JSON data
		proteinAccession = data.matches[0].protein_accession;
		proteinName = data.matches[0].protein_name;
		locationMin = data.matches[0].location_min;
		locationMax = data.matches[0].location_max;
		strand = data.matches[0].strand;
		organism = data.matches[0].organism;
		organismID = data.matches[0].organism_id;
		beforeSequence = data.matches[0].before_sequence;
		geneSequence = data.matches[0].residue_sequence;
		afterSequence = data.matches[0].after_sequence;
		
		
		// retrieve stored parameters from data_div
		fivePrimeStart = $('#data_div').data("five_prime_start");
		threePrimeStart = $('#data_div').data("three_prime_start");
		beforeContext = $('#data_div').data("before_context");
		afterContext = $('#data_div').data("after_context");
		fivePrimeLength = $('#data_div').data("five_prime_length");
		threePrimeLength = $('#data_div').data("three_prime_length");
		
		// initialize fivePrimeStart and threePrimeStart to the
		// beginning and end of the gene respectively
		if(fivePrimeStart == null) {
			fivePrimeStart = beforeSequence.length;
		}
		if(threePrimeStart == null) {
			threePrimeStart = 1 * beforeSequence.length + 1 * geneSequence.length;
		}
		
		// store parameters to data_div
		$('#data_div').data("protein_accession", proteinAccession);
		$('#data_div').data("protein_name", proteinName);
		$('#data_div').data("location_min", locationMin);
		$('#data_div').data("location_max", locationMax);
		$('#data_div').data("strand", strand);
		$('#data_div').data("organism", organism);
		$('#data_div').data("organism_id", organismID);
		$('#data_div').data("before_sequence", beforeSequence);
		$('#data_div').data("gene_sequence", geneSequence);
		$('#data_div').data("after_sequence", afterSequence);
		$('#data_div').data("five_prime_start", fivePrimeStart);
		$('#data_div').data("three_prime_start", threePrimeStart);

		data = null;
	}
	else {
		// retrieve stored parameters and gene information from data_div
		proteinAccession = $('#data_div').data("protein_accession");
		proteinName = $('#data_div').data("protein_name");
		locationMin = $('#data_div').data("location_min");
		locationMax = $('#data_div').data("location_max");
		strand = $('#data_div').data("strand");
		organism = $('#data_div').data("organism");
		organismID = $('#data_div').data("organism_id");
		beforeSequence = $('#data_div').data("before_sequence");
		geneSequence = $('#data_div').data("gene_sequence");
		afterSequence = $('#data_div').data("after_sequence");
		fivePrimeStart = $('#data_div').data("five_prime_start");
		threePrimeStart = $('#data_div').data("three_prime_start");
		beforeContext = $('#data_div').data("before_context");
		afterContext = $('#data_div').data("after_context");
		fivePrimeLength = $('#data_div').data("five_prime_length");
		threePrimeLength = $('#data_div').data("three_prime_length");
	}
	
	$('#before_context').val(beforeContext);
	$('#after_context').val(afterContext);
	$('#five_prime_length').val(fivePrimeLength);
	$('#three_prime_length').val(threePrimeLength);
	$('#five_prime_start').val(fivePrimeStart);
	$('#three_prime_start').val(threePrimeStart);
	
	/******************************************************************
	 * Styling Control Structure
	 ******************************************************************
	 * Basic Context Types:
	 * 
	 * 	                  +-------------------+ +--------------------------------+ +----------------------------+
	 *                    |       before      | |               gene             | |           after            |
	 *                    +-------------------+ +--------------------------------+ +----------------------------+
	 * 
	 * 
	 * Basic Context Types Broken Up by Binding Primers:
	 * 
	 *                                #----------------->
	 * 	                  +---------+ +-------+ +-------+ +----------------------+ +--------+ +-----------+ +---+
	 *                    |         | |       | |       | |                      | |        | |           | |   |
	 *                    +---------+ +-------+ +-------+ +----------------------+ +--------+ +-----------+ +---+
	 *                                                                                        <-----------#
	 * context type       before      before    gene      gene                     after      after         after
	 * 5' primer bound    null        5' primer 5' primer null                     null       null          null
	 * 3' primer bound    null        null      null      null                     null       3' primer     null
	 * 
	 * In the diagram above the pound (#) symbol represents the start of 
	 * a primer and the arrow (> or <) represents the end of a primer.
	 * 
	 * I will break up the sequence into character arrays. Then they 
	 * will be concatenated into a single array prior to processing. 
	 * This full array is then annotated with all the points where its 
	 * features change. These features include the beginning and end of 
	 * the three context types, before the gene, the gene, and after the 
	 * gene. They also include the beginning and end of the 5' primer 
	 * and 3' primers. Note that the start of the 3' primer actually 
	 * is after the end if you're reading from left to right (rather
	 * than 5' to 3'). The annotated structure is stored in an array
	 * called deltaSeqArray. Each index of deltaSeqArray contains an
	 * IndexSeqArray object which contains the nucleotide, contextStart,
	 * contextEnd, fivePrimeStart, fivePrimeEnd, threePrimeStart, and
	 * threePrimeEnd. For more details see the IndexSeqArray class. 
	 * 
	 * Once the sequence is annotated it is broken into fragment arrays
	 * at each change position from the deltaSeqArray annotation. These
	 * fragments are stored in the array styleSeqArrays as SeqArray
	 * objects. SeqArray objects contain a sequence array, the 
	 * contextType, the fivePrime status, and the threePrime status. 
	 * These values will be later used to style the output for display.
	 * For more dtails see the SeqArray class.
	 * 
	 * Once the sequence is broken down into arrays it is processed for
	 * display using jQuery methods.
	 * 

	 * 
	 * In order to style it properly for display, the above sequence 
	 * would be broken into 7 ordered character arrays.

	 * 
	 * Note: This primer design program does not allow unfilled 
	 * overhangs as this stage. Primers designed with unfilled gene 
	 * sequence overhangs would almost always be a mistake and therefore 
	 * have been disallowed.
	 * 
	 ******************************************************************/
	
	/******************************************************************
	 * Process sequence strings into a single array. For genes on the -1
	 * strand process them into the reverse complement.
	 ******************************************************************/
	// split the sequence strings into arrays for processing
	var beforeArray = beforeSequence.split("");
	var geneArray = geneSequence.split("");
	var afterArray = afterSequence.split("");
	
	// check to see if the gene is on the reverse strand
	if(strand == -1) {
		// reverse the order of the assembly sequence
		// swap before and after sequences
		var afterTemp = beforeArray.reverse().join("");
		var geneTemp = geneArray.reverse().join("");
		var beforeTemp = afterArray.reverse().join("");
		
		// Create a complementary array and save it back into
		// the original array variables
		beforeArray = beforeTemp.replace(/A/g, "X").replace(/T/g, "A")
			.replace(/X/g, "T").replace(/C/g, "Y").replace(/G/g, "C")
			.replace(/Y/g, "G").split("");
		geneArray = geneTemp.replace(/A/g, "X").replace(/T/g, "A")
			.replace(/X/g, "T").replace(/C/g, "Y").replace(/G/g, "C")
			.replace(/Y/g, "G").split("");
		afterArray = afterTemp.replace(/A/g, "X").replace(/T/g, "A")
			.replace(/X/g, "T").replace(/C/g, "Y").replace(/G/g, "C")
			.replace(/Y/g, "G").split("");
	}
	
	// concatenate all of the sequence arrays into a single array to
	// simplify processing in a for loop
	var fullSeq = beforeArray.concat(geneArray,afterArray);
	
	/******************************************************************
	 * Create deltaSeqArray annotating where a structures lie along the
	 * sequence.
	 ******************************************************************/
	var deltaSeqArray = [];
	for(var i = 0; i < fullSeq.length; i++) {
		deltaSeqArray[i] = new IndexSeqArray(fullSeq[i], null, null, null, null, null, null);
		//Start of 5' primer
		if(i == fivePrimeStart) {
			deltaSeqArray[i].fivePrimeStart = "five_prime_start";
		}
		//End of 5' primer
		if(i == 1 * fivePrimeStart + 1 * fivePrimeLength - 1) {
			deltaSeqArray[i].fivePrimeEnd = "five_prime_end";
		}
		//End of 3' primer
		if(i == 1 * threePrimeStart - 1 * threePrimeLength) {
			deltaSeqArray[i].threePrimeEnd = "three_prime_end";
		}
		//Start of 3' primer
		if(i == threePrimeStart - 1) {
			deltaSeqArray[i].threePrimeStart = "three_prime_start";
		}
		if(beforeArray.length == 0) {
			//Do Nothing No Before Context
		}
		else {
			//Start of before context
			if(i == 0) { 
				deltaSeqArray[i].contextStart = "before_start";
			}
			//End of before context
			if(i == beforeArray.length - 1) {
				deltaSeqArray[i].contextEnd = "before_end";
			}
		}
		//Start of gene context
		if(i == beforeArray.length) {
			deltaSeqArray[i].contextStart = "gene_start";
		}
		//End of gene context
		if(i == 1 * beforeArray.length + 1 * geneArray.length - 1) {
			deltaSeqArray[i].contextEnd = "gene_end";
		}
		if(afterArray.length == 0) {
			//Do Nothing No After Context
		}
		else {
			//Start of after context
			if(i == 1 * beforeArray.length + 1 * geneArray.length) {
				deltaSeqArray[i].contextStart = "after_start";
			}
			//End of after context
			if(i == 1 * beforeArray.length + 1 * geneArray.length + 1 * afterArray.length - 1) {
				deltaSeqArray[i].contextEnd = "after_end";
			}
		}
	}
	
	/******************************************************************
	 * Break the sequence up using annotation in deltaSeqArray. Store
	 * the new arrays in styleSeqArrays. Each array index contains an
	 * array sequence fragment and all of the style class names 
	 * necessary to display it properly in the UI.
	 ******************************************************************/
	var contextStartTemp;
	var contextEndTemp
	var fivePrimeStartTemp;
	var fivePrimeEndTemp;
	var threePrimeStartTemp;
	var threePrimeEndTemp;

	var context = null;
	var fivePrime = null;
	var threePrime = null;
	var amplified = null;
	
	var styleSeqArrays = [];
	for(var i = 0, j = 0; i < deltaSeqArray.length; i++) {
		//get all the values for this index of deltaSeqArray
		nucleotideTemp = deltaSeqArray[i].getNucleotide();
		contextStartTemp = deltaSeqArray[i].getContextStart();
		contextEndTemp = deltaSeqArray[i].getContextEnd();
		fivePrimeStartTemp = deltaSeqArray[i].getFivePrimeStart();
		fivePrimeEndTemp = deltaSeqArray[i].getFivePrimeEnd();
		threePrimeStartTemp = deltaSeqArray[i].getThreePrimeStart();
		threePrimeEndTemp = deltaSeqArray[i].getThreePrimeEnd();
		
		//if a new section has started
		if(contextStartTemp != null ||  fivePrimeStartTemp != null || threePrimeEndTemp != null) {
			if(contextStartTemp != null) {
				if(contextStartTemp == "before_start") {
					context = "before";
				}
				else if(contextStartTemp == "gene_start") {
					context = "gene";
				}
				else {
					context = "after";
				}
			}
			if(fivePrimeStartTemp == "five_prime_start") {
				fivePrime = "five_prime";
				amplified = "amplified";
			}
			if(threePrimeEndTemp == "three_prime_end") {
				threePrime = "three_prime";
			}
			if(i > 0) {
				j++;
				styleSeqArrays[j] = new SeqArray(new Array(), context, fivePrime, threePrime, amplified);	
			}
		}
		if(i == 0) {
			styleSeqArrays[j] = new SeqArray(new Array(), context, fivePrime, threePrime, amplified);
		}
		styleSeqArrays[j].getArray().push(nucleotideTemp);
		//if a section has ended
		if(contextEndTemp != null || fivePrimeEndTemp != null || threePrimeStartTemp != null) {
			if(contextEndTemp != null) {
				context = null;
			}
			if(fivePrimeEndTemp != null) {
				fivePrime = null;
			}
			if(threePrimeStartTemp != null) {
				threePrime = null;
				amplified = null;
			}
			j++;
			styleSeqArrays[j] = new SeqArray(new Array(), context, fivePrime, threePrime, amplified);
		}
	}
	
	/******************************************************************
	 * Render fail check to make sure the user has not given illegal
	 * values in the customization form.
	 ******************************************************************/
		
	var renderFail = false;
	
	// If the primers have too short of length, fail
	if(threePrimeLength <= 0 || fivePrimeLength <= 0) {
		alert("Warning: Primer Out of Range!");
		renderFail = true;
	}
	// If the 5' primer starts before 0, fail
	else if(fivePrimeStart < 0) {
		alert("Warning: Primer Out of Range!");
		renderFail = true;
	}
	// If the 3' primer starts after the end of the sequence, fail
	else if(1 * threePrimeStart > fullSeq.length) {
		alert("Warning: Primer Out of Range!");
		renderFail = true;
	}
	// If the end of the 3' primer is before the beginning of the sequence, fail
	else if(1 * threePrimeStart - 1 * threePrimeLength < 0) {
		alert("Warning: Primer Out of Range!");
		renderFail = true;
	}
	else if(1 * fivePrimeStart + 1 * fivePrimeLength > fullSeq.length) {
		alert("Warning: Primer Out of Range!");
		renderFail = true;
	}
	else if(1 * fivePrimeStart + 1 * fivePrimeLength > threePrimeStart) {
		alert("Warning: 3' before 5' primer: unfilled overhangs are not allowed by this program!");
		renderFail = true;
	}
	else if(1 * threePrimeStart - 1 * threePrimeLength < fivePrimeStart) {
		alert("Warning: 3' before 5' primer: unfilled overhangs are not allowed by this program!");
		renderFail = true;
	}
	
	/******************************************************************
	 * Display the gene information. Create all necessary <td> elements 
	 * and wrap them in a table row. Append the row to the gene_tbody 
	 * table.
	 ******************************************************************/
	
	$('<td/>', { "text" : proteinAccession } )
		.add($('<td/>', { "text" : proteinName } ))
		.add($('<td/>', { "text" : locationMin } ))
		.add($('<td/>', { "text" : locationMax } ))
		.add($('<td/>', { "text" : strand } ))
		.add($('<td/>', { "text" : organism } ))
		.wrapAll('<tr/>').parent().appendTo('#gene_tbody');

	/******************************************************************
	 * Display the sequence information. Each array from styleSeqArrays
	 * is wrapped in a span that is styled according to the classes
	 * stored alongside it in styleSeqArrays. styleSeqArrays can contain
	 * empty sequence arrays. If this happens span tags containing the
	 * turned on classes will be written to the DOM but they will be
	 * empty and so will not display anything to the user. While this
	 * behavior could be removed it might not be very much more 
	 * efficient anyway as 1-2 of these events will occur at most.
	 ******************************************************************/
	
	if(renderFail) {
		/*****************
		 * STUB
		 * STUB
		 * Do nothing for now. In the future I may append warning text 
		 * to the output as well.
		 * STUB
		 * STUB
		 *****************/
	}
	else { 
		// this value determines the number of characters per line in the displayed sequence
		// Use Integer math to find the whole number of 100 character lines
		var lineLength = 100;
		
		var subsequence;
		var subcomplement;
		var subsequenceId;
		var remainder = 0;
		var stringLength;
		var wholeLines;
		var exactFinish = false;
		
		var sequenceString;
		var complementString;
		
		for(var i = 0; i < styleSeqArrays.length; i++) {
			sequenceString = styleSeqArrays[i].getArray().join("");
			// Create a complementary string to show alongside the coding string
			complementString = sequenceString.replace(/A/g, "X")
				.replace(/T/g, "A").replace(/X/g, "T").replace(/C/g, "Y")
				.replace(/G/g, "C").replace(/Y/g, "G");
			
			// if the assembly before the sequence ends on a partial line, 
			// connect the next sequence to it in the same line
			if(i > 0 && remainder > 0) {
				// if the next sequence will fill the remainder of the line
				if(sequenceString.length >= remainder) {
					subsequence = sequenceString.substring(0, remainder);
					subcomplement = complementString.substring(0, remainder);
					// if the next sequence exceeds the remainder
					if(sequenceString.length > remainder)
					{
						sequenceString = sequenceString.substring(remainder);
						complementString = complementString.substring(remainder);
					}
					// if the next sequence equals the remainder
					else {
						exactFinish = true;
					}
					$('#seq_insert_' + (i - 1))
						.after('<span class="' + styleSeqArrays[i].getContextType() + ' ' +
						styleSeqArrays[i].getFivePrime() + ' ' + styleSeqArrays[i].getAmplified() + '">' +
						subsequence + '</span>');
					$('#comp_insert_' + (i - 1))
						.after('<span class="' + styleSeqArrays[i].getContextType() + ' ' + 
						styleSeqArrays[i].getThreePrime() + ' ' + styleSeqArrays[i].getAmplified() + '">' + 
						subcomplement + '</span>');
					remainder = 0;
				}
				// if the next sequence will not fill the remainder of the line
				else {
					subsequence = sequenceString;
					subcomplement = complementString;
					$('#seq_insert_' + (i - 1)).after('<span id="seq_insert_' + i + '" class="' 
						+ styleSeqArrays[i].getContextType() + ' ' + styleSeqArrays[i].getFivePrime() + 
						' ' + styleSeqArrays[i].getAmplified() + '">' + subsequence + '</span>');
					$('#comp_insert_' + (i - 1)).after('<span id="comp_insert_' + i + '" class="' 
						+ styleSeqArrays[i].getContextType() + ' ' + styleSeqArrays[i].getThreePrime() + 
						' ' + styleSeqArrays[i].getAmplified() + '">' + subcomplement + '</span>');
					remainder = remainder - subsequence.length;
				}
			}
			
			// if the previous line is full produce a new table row and fill it
			// with styled sequence information, including both the sequence
			// and the complementary sequence.
			if(remainder == 0 && exactFinish == false) {
				stringLength = sequenceString.length;
				wholeLines = ~~(stringLength / lineLength);
				
				for(var j = 0; j <= wholeLines && stringLength != lineLength * j; j++) { 
					subsequenceId = 'array_' + i + '_row_' + j;
					// create a row and append it to the body of the sequence table
					$('<tr/>', { "id" : subsequenceId } ).appendTo('#sequence_tbody');
					if(stringLength < lineLength * (j + 1)) {
						subsequence = sequenceString.substring(lineLength * j);
						subcomplement = complementString.substring(lineLength * j);
						remainder = lineLength - subsequence.length;
						($('<p/>').append($('<span/>', { "id" : "seq_insert_" + i, 
							"class" : styleSeqArrays[i].getContextType() + " " + 
							styleSeqArrays[i].getFivePrime() + " " + styleSeqArrays[i].getAmplified(), 
							"text" : subsequence } )).add($('<p/>')
							.append($('<span/>', { "id" : "comp_insert_" + i, 
							"class" : styleSeqArrays[i].getContextType() + " " + 
							styleSeqArrays[i].getThreePrime() + " " + 
							styleSeqArrays[i].getAmplified(), 
							"text" : subcomplement } ))))
							.wrapAll('<td/>').parent().appendTo('#' + subsequenceId);
					}
					else {
						subsequence = sequenceString.substring(lineLength * j, lineLength * (j + 1));
						subcomplement = complementString.substring(lineLength * j, lineLength * (j + 1));
						($('<p/>').append($('<span/>', { "class" : styleSeqArrays[i].getContextType() + " " + 
							styleSeqArrays[i].getFivePrime() + " " + styleSeqArrays[i].getAmplified(), 
							"text" : subsequence } )).add($('<p/>')
							.append($('<span/>', { "class" : styleSeqArrays[i].getContextType() + " " 
							+ styleSeqArrays[i].getThreePrime() + " " + styleSeqArrays[i].getAmplified(), 
							"text" : subcomplement } ))))
							.wrapAll('<td/>').parent().appendTo('#' + subsequenceId);
					}
				}
			}
			else {
				exactFinish = false;
			}
		}
	}
	
	// display primers in primer section
	var fivePrimeArray = fullSeq.slice(fivePrimeStart,1 * fivePrimeStart + 1 * fivePrimeLength);
	var threePrimeArray = fullSeq.slice(threePrimeStart - threePrimeLength,threePrimeStart);
	
	var fivePrimeString = fivePrimeArray.join("");
	var threePrimeString = threePrimeArray.reverse().join("").replace(/A/g, "X").replace(/T/g, "A")
			.replace(/X/g, "T").replace(/C/g, "Y").replace(/G/g, "C")
			.replace(/Y/g, "G");
	
	$('#five_prime_primer').val("5' - " + fivePrimeString + " - 3'");
	$('#three_prime_primer').val("5' - " + threePrimeString + " - 3'");
	

	// store primers to data_div
	$('#data_div').data("five_prime_primer", fivePrimeString);
	$('#data_div').data("three_prime_primer", threePrimeString);

	// now show the output section that was previously hidden
	$('#output').show();
	$('#primers').show();
}

/**********************************************************************
 * primerAnalysis()
 **********************************************************************
 * Display server-side analysis of primers
 **********************************************************************/
function primerAnalysis( data ) {
	var proteinAccession = $('#data_div').data("protein_accession");
    
    if(data.five_prime_count > 0) {
		$('<span/>', { "text" : "WARNING: Non-Specific Binding!", "class" : "fail" } ).appendTo('#five_prime_analysis');
	}
	else {
		$('<span/>', { "text" : "Success: Unique Primer!", "class" : "success" } ).appendTo('#five_prime_analysis');
	}
    
    if(data.three_prime_count > 0) {
		$('<span/>', { "text" : "WARNING: Non-Specific Binding!", "class" : "fail" } ).appendTo('#three_prime_analysis');
	}
	else {
		$('<span/>', { "text" : "Success: Unique Primer!", "class" : "success" } ).appendTo('#three_prime_analysis');
	}
}

/**********************************************************************
 * isEmpty()
 **********************************************************************
 * Helper function to identify empty jQuery form fields.
 * Called by using $('div').isEmpty();
 **********************************************************************/
jQuery.fn['isEmpty'] = function() {
	if($.trim($(this).val()) === '') {
		return true;
	}
};

/**********************************************************************
 * IndexSeqArray Class
 **********************************************************************
 * This function stores 7 variables
 * nucleotide: holds an single DNA nucleotide character
 * contextStart: holds the string: "before_start", "gene_start", "after_start", or null
 * contextEnd: holds the string: "before_end", "gene_end", "after_end", or null
 * fivePrimeStart: holds the string: "five_primer_start" or null
 * fivePrimeEnd: holds the string: "five_primer_end" or null
 * threePrimeStart: holds the string: "three_primer_start" or null
 * threePrimeEnd: holds the string: "three_primer_end" or null
 * 
 * Each one of these values has a prototype get function
 * This prevents additional cluttering of the name space and
 * prevents storing these functions for each IndexSeqArray object
 **********************************************************************/
function IndexSeqArray (nucleotide, contextStart, contextEnd, fivePrimeStart, fivePrimeEnd, threePrimeStart, threePrimeEnd) {
	this.nucleotide = nucleotide;
	this.contextStart = contextStart;
	this.contextEnd = contextEnd;
	this.fivePrimeStart = fivePrimeStart;
	this.fivePrimeEnd = fivePrimeEnd;
	this.threePrimeStart = threePrimeStart;
	this.threePrimeEnd = threePrimeEnd;
}

IndexSeqArray.prototype.getNucleotide = function() {
	return this.nucleotide;
};

IndexSeqArray.prototype.getContextStart = function() {
	return this.contextStart;
};

IndexSeqArray.prototype.getContextEnd = function() {
	return this.contextEnd;
};

IndexSeqArray.prototype.getFivePrimeStart = function() {
	return this.fivePrimeStart;
};

IndexSeqArray.prototype.getFivePrimeEnd = function() {
	return this.fivePrimeEnd;
};

IndexSeqArray.prototype.getThreePrimeStart = function() {
	return this.threePrimeStart;
};

IndexSeqArray.prototype.getThreePrimeEnd = function() {
	return this.threePrimeEnd;
};

/**********************************************************************
 * SeqArray Class
 **********************************************************************
 * This function stores 5 variables
 * array: holds an array of characters forming a sequnce of DNA
 * contextType: holds the css classes: "before", "gene", or "after"
 * fivePrime: holds the css class: "five_primer", or null
 * threePrime: holds the css class: "three_primer", or null
 * 
 * Each one of these values has a prototype get function
 * This prevents additional cluttering of the name space and
 * prevents storing these functions for each SeqArray object
 **********************************************************************/
function SeqArray (array, contextType, fivePrime, threePrime, amplified) {
	this.array = array;
	this.contextType = contextType;
	this.fivePrime = fivePrime;
	this.threePrime = threePrime;
	this.amplified = amplified;
}

SeqArray.prototype.getArray = function() {
	return this.array;
};

SeqArray.prototype.getContextType = function() {
	return this.contextType;
};

SeqArray.prototype.getFivePrime = function() {
	return this.fivePrime;
};

SeqArray.prototype.getThreePrime = function() {
	return this.threePrime;
};

SeqArray.prototype.getAmplified = function() {
	return this.amplified;
};


/**********************************************************************
 * $(document).ready()
 **********************************************************************
 * Run the javascript once the page is fully loaded. This function also
 * listens for user input from form submissions and autocomplete input
 * typing.
 **********************************************************************/
$(document).ready( function() {
    // define what should happen when a user clicks submit on our search form
    $('#submit').click( function() {
        runSearch();
        return false;  // prevents 'normal' form submission
    });
    $('#resubmit').click( function() {
		refineSearch();
		return false; // prevents 'normal' form submission
	});
	$('#customize').click(function() {
		customizeSearch();
		return false;  // prevents 'normal' form submission
	});
	$('#analyze').click(function() {
		analyzePrimers();
		return false;  // prevents 'normal' form submission
	});
    $(function(){
		autoFill();
	});
	
	// Use javascript to hide these elements until they are ready for
	// display. CSS display: none; was not used because these elements
	// have another diplay type already. 
	$('#primers').hide();
	$('#output').hide();
	$('#results').hide();
});
