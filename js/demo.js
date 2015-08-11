/*
 * Author   : Martin Donk
 * Website  : http://www.nerdamer.com
 * Email    : martin.r.donk@gmail.com
 * version  : 2.0
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

(function(){
    //remove any expressions which may currently be loaded
    nerdamer.clear('all');
    
    //set the version
    $('.version').html("Using version "+nerdamer.version());

    var $input = $('#expr-input'),
        $submit = $('#expr-submit'),
        $panel = $('#expr-panel'),
        $clear = $('#clear-all'),
        isDiv = $input.prop('tagName') === 'DIV',
        getFn = isDiv ? 'text' : 'val',
        setFn = isDiv ? 'html' : 'val',
        history = [],
        modifiers = [],
        lastRecalled = 0,
        //Create chart variables
        $start = $('#graph_start'),
        $end = $('#graph_end'),
        $step = $('#graph_step'),
        $type = $('#graph_type'),
        data_columns = [ ['x']],
        chart_step = 1,
        chart_start = 1,
        chart_end = 10,
        chart = {},
        new_chart = function() {
            chart = c3.generate({
			bindto: '#graph',
			data: {
				x: 'x',
				columns: data_columns,
				type: $type.val()
			},
			zoom: {
				enabled: true
			}
		  });
        };

    new_chart();

    var get_function_num = function(text) {
        if (text == 'x')
        {
            return -1;
        }
        return parseInt(text.substring(1,text.length),10);
    };

    //Loop through and generate data for each function
    var gen_chart_data = function(name,expression) {
        var graph_data = [name];
        var start_domain = Number(chart_start);
        var step_domain  = Number(chart_step);
        var end_domain = Number(chart_end);
        var expressions_length = nerdamer.expressions().length;
        for (var i = start_domain; i <= end_domain ; i += step_domain)
        {
            var out = 0;
            try
            {
                out = nerdamer(expression,{x:i}).evaluate().valueOf();
            }
            catch(err)
            {
                console.log(err.message);
            }
            graph_data.push(out);

        }

        while (nerdamer.expressions().length > expressions_length)
        {
            nerdamer.clear(expressions_length+1);
        }


        return graph_data;
    };

    //Update all functions
    var update_graph = function() {
        //Generate domain
        var graph_domain = d3.range(chart_start, (chart_end+chart_step) , chart_step);
        graph_domain.unshift('x');

        data_columns.forEach(function(val, i,arr)
        {
            var array_name = val[0];
            if (i == 0)
            {
                arr[i] = graph_domain;
            }
            else
            {
                arr[i] = gen_chart_data(array_name,nerdamer.expressions()[ get_function_num(array_name) ]  );
            }
        });

        //Load chart
        new_chart();
	};

    //Add new data to graph
	var add_data_to_graph = function(data) {
        //Update
        update_graph();
        var function_number = get_function_num(data[0]);
        data_columns
        var insert_index = data_columns.reduce(function(iMax,x,i,a) {
            return ((get_function_num(x[0]) > get_function_num(a[iMax][0]) ) && (get_function_num(x[0]) < function_number )) ? i : iMax;
        }, 0);

        data_columns.splice(insert_index+1, 0, data);

        //Load chart
        new_chart();
        console.log(data_columns);
	};

    //Delete data from graph
    var delete_data_graph = function(name) {
        var delete_index = get_function_num(name);
        var changed = false;
        data_columns.forEach(function(val, i,arr)
        {
            var current_name = val[0];
            if (current_name == name)
            {
                changed = true;
            }

            if (get_function_num(current_name) >= delete_index)
            {
                var num = get_function_num(current_name);
                --num;
                arr[i][0] = '%'+( num.toString() );
            }
        });

        if (changed) {
            data_columns.splice(delete_index, 1);
        }
        //Update
        update_graph();

	};



    //format the text from mathquill into something that nerdamer can understand
    var standardize = function(text) {
        return text.replace(/\*\*/g, '^')
                .replace(/\*/g, '')
                .replace(/cdot /g, '*')
                .replace(/([a-z0-9_])(\({2})(.*?,.*?)(\){2})/gi, function(){
                    return arguments[1]+'('+arguments[3]+')';
                });
    };

    //this renders to the user by appending it to the output panel
    function render(result, eqNumber, $panel){
        var div = $('<div class="panel-row"></div>'),
        span;
        
        //keep in mind that the eqNumber may be equal to zero, in which case the next check returns false.    
        if(eqNumber) {
            //set the equation number for easy removal from the DOM later
            div.data('eqNumber', eqNumber);
            div.append('<span class="bold">%'+eqNumber+' </span>: '); 
            span = $('<span>$'+result+'$<span>');
            //span.mathquill('redraw').appendTo(div).mathquill();
            span.appendTo(div);
            //Graph button
            div.append('  <a href="javascript:void(0)" class="add_graph">add graph</a>');
        }
        else {
            div.append('<span class="info">'+result+'<span>');
        }
        
        div.append(' <a href="javascript:void(0)" class="delete">delete</a>');


        $panel.append(div);
        //if(span) span.mathquill('redraw');
        
        //Typeset the math with Mathjax
        MathJax.Hub.Queue(["Typeset",MathJax.Hub,div[0]]);
    }
    
    var getInput = function() {
        return $input[getFn]().split(' ').join('');
    };
    

    //split the string into two pieces. The first being the declaration and the rest being the parameters
    var separate = function(s) {
        var l = s.length,
            openBrackets = 0;
        for(var i=0; i<l; i++) {
            var ch = s.charAt(i);
            if(ch === '(' || ch === '[') openBrackets++; //record and open brackets
            if(ch === ')' || ch === ']') openBrackets--; //close the bracket
            if(ch === ',' && !openBrackets) return [s.substr(0, i), s.substr(i+1, l)];
        }
        return [s, ''];
    };

    //read the declared knowns into an object
    var getKnowns = function(knownsString) { 
        var knownsArray = knownsString.split(',');
        var knowns = {};
        for(var i=0; i<knownsArray.length; i++) {
            var known = knownsArray[i].split('=');
            //if a known was declare then return one
            if(known[0]) knowns[known[0]] = known[1];
        }
        return knowns;
    };

    //the declaration may be a request to reuse a previously declare expression
    //this is made known by starting with %
    var evaluate = function(str) { 
        var declarationParts = separate(str),
            declaration = declarationParts[0],
            knownsString = declarationParts[1],
            firstChar = declaration.charAt(0),
            expression = str;

            //is it a function declaration?
            var matches = /(.+)\((.+)\):=(.+)/g.exec(declaration);

        if(matches) {
            //if there are matches then it's a function declaration so let's treat it as such
            var fnName = matches[1],
            //extract the variables declarations by first removing the brackets and then splitting 
            //the string by the commas
            variables = matches[2].split(','),
            //the functions body
            fnBody = matches[3];
            
            
            //validate the function name
            try { 
                nerdamer.validateName(fnName);
                //set the functions
                nerdamer.setFunction(fnName, variables, fnBody);
                return 'Info: function '+fnName+' was successfully set using '+declaration;
            }
            catch(e) {;}    
            return 'Error: Could not set '+fnName+'. Invalid function name.';
        }
        else {
            try{
                var cps = declaration.split(':');
                if(cps.length > 1) {
                    var v = cps.shift();
                    var val = cps.shift().split(',').shift();
                    nerdamer.setVar(v, val);
                    return 'Info: variable '+v+' '+(val === 'delete' ? 'was deleted' : 'was set to '+val);
                }
            }
            catch(e){;}
            
            //the expression must be the declaration
            expression = declaration;
        }

        //add the expression 
        try {
            //read out one or more variable declarations
            expression = expression.replace(/%\d*/g, function() {
                var eqNumber = arguments[0].substr(1, arguments[0].length);
                try {
                    result = nerdamer.getEquation(eqNumber)[getFn]();
                } 
                catch(e) {
                    result = 0;
                }
                var retval = '('+result+')';
                return retval;
            });

            var result = nerdamer(expression, getKnowns(knownsString), modifiers),
            type = result.isNumber() && !result.isInfinity() ? 'text' : 'latex';
            modifiers = [];
            return nerdamer.getEquation()[type]();
        }
        catch(e) {
            console.log(e.stack)
            return e;
        }
    };
    
    var recordHistory = function(input) {
        history.push($input[getFn]());
        lastRecalled = 0;
    };
    
    var setInputData = function(data) {
        //clear the input
        $input[setFn](data);
    };
    
    var clearInput = function() {
        $input[setFn]('');
    };
    
    var browseHistory = function(direction) {
        var what,
        count = history.length;
        if( direction === 'up' ) {
            what = ( lastRecalled === 0 ) ? count-1 : lastRecalled -1;
        }
        else {
            what = ( lastRecalled === count-1 ) ? 0 : lastRecalled +1;
        }
        lastRecalled = what;
        
        //set the value of the input
        var data = history[lastRecalled];
        setInputData(data);
    };
    
    /*** Event binding ***/
    $submit.click(function() {
        $('.nerdamer-modifier').each(function() {
            var $this = $(this);
            if($this.is(":checked")) modifiers.push($this.attr('name'));
        });
        var numEquations = nerdamer.numEquations(),
        input = getInput(),
        result = evaluate(input),
        num = 0,
        newNumEquations = nerdamer.numEquations();
        
        //record the history
        recordHistory(input);
        
        //if they don't equal each other then an equation was added
        if(numEquations !== newNumEquations) num = newNumEquations;
        //render the result
        render(result, num, $panel);
        
        //clear the input
        clearInput();
    });
    
    //bind the keys
    $input.keydown(function (e){
        switch( e.keyCode ) {
            case 13:
                e.preventDefault();
                $submit.click();
                break;
            case 38:
                browseHistory('up');
                break;
            case 40: 
                browseHistory('down');
                break;
        }
    });
    
    $clear.click(function() {
        nerdamer.clear('all');
        //Override graph
        data_columns = [ ['x']];
        new_chart();
        //remove all panel-rows from the DOM
        $('.panel-row').remove();
    });

    $panel.on('click', '.delete', function(e) {
        e.preventDefault();
        var $parent = $(this).parent();
        
        $('.panel-row').each(function( index, element ) {
            if ($(this).data('eqNumber') > $parent.data('eqNumber'))
            {
                $(this).data('eqNumber', index);
                $(this).find('.bold').text("%"+index+" ");
            }
        });


        nerdamer.clear($parent.data('eqNumber'));

        //remove the equation
        delete_data_graph('%'+($parent.data('eqNumber') -1));

        
        //remove the div from the DOM
        $parent.remove();
    });




	//Callback for graphing
	$panel.on('click', '.add_graph', function(e) {
        e.preventDefault();
        var $parent = $(this).parent();

		var expression = nerdamer.expressions()[$parent.data('eqNumber') -1];

        add_data_to_graph(gen_chart_data('%'+($parent.data('eqNumber') -1), expression ));
    });


    //Start textbox changed
    $start.on('input',function() {

        if (jQuery.isNumeric($start.val()) && jQuery.isNumeric($end.val()) )
        {
            var num_graph_start = parseFloat($start.val(),10);
            var num_graph_end = parseFloat($end.val(),10);
            if (num_graph_start < num_graph_end)
            {

                chart_start = num_graph_start;
                update_graph();
            }
        }
    });


    //End textbox changed
    $end.on('input',function() {

        if (jQuery.isNumeric($start.val()) && jQuery.isNumeric($end.val()) )
        {
            var num_graph_start = parseFloat($start.val(),10);
            var num_graph_end = parseFloat($end.val(),10);
            if (num_graph_start < num_graph_end)
            {
                chart_end = num_graph_end;
                update_graph();
            }
        }
    });

    $step.on('input',function() {

        if (jQuery.isNumeric($step.val()))
        {
            var num_graph_step = parseFloat($step.val(),10);
            if (num_graph_step > 0)
            {
                chart_step = num_graph_step;
                update_graph();
            }
        }
    });


    $type.on('change', function() {
        chart.transform($type.val());
    })

})();