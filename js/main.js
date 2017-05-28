/**
 * 
 * IHME Overweight and Obesity Study 2013 Data Visualization
 * Prevalence in Country Compared with Prevalence in Global Population 1990-2013
 * --- Version 1.0.0
 * --- Tohm Judson, May 2017
 *
 */

// Filtering Options
var yearOptions = [1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013];
var sexOptions = ["male", "female", "both"];
var bmiOptions = ["overweight", "obese"];

// Dimensions and margins
var margin = {top: 10, right: 100, bottom: 10, left: 100};
var width = 1000 - margin.left - margin.right;
var height = 640 - margin.top - margin.bottom;

// Scales
var xScale = d3.scaleLinear().range([0, width - 300]);
var yScale = d3.scaleBand().range([height, 0]).padding(0.25);

// Formatting
var formatPercent = d3.format(",.1%");
var tau = 2 * Math.PI;

/**
 *  Initialize on load
 */

function initialize() {

  // Loading text and flashing function
  d3.select("#loading")
    .append("text")
      .text("Loading data, please wait...")

  function loadingText() {
    d3.select("#loading").select("text")
      .transition()
        .duration(1000)
        .style("opacity", 1)
      .transition()
        .duration(1000)
        .style("opacity", 0)
      .on("end", loadingText)
  };

  loadingText();

  var selectedYear = "1990";
  var countryOptions = [];
  var countryOptionsSorted = [{text: "Regions", children: []}, {text: "Countries", children: []}];

  /**
   *  Load CSV
   */

  d3.csv("data/IHME_GBD_2013_OBESITY_PREVALENCE_1990_2013_Y2014M10D08.CSV", function(error, data) {
    if(error) throw error;

    d3.select("#loading").remove();

    /**
     *  Data Manipulation
     */

    // Extract countries/regions and sort
    for(var i = 0; i < data.length; i++){
      if(countryOptions.indexOf(data[i].location_name) === -1 && data[i].location_name !== "Global"){
        countryOptions.push(data[i].location_name); // Place country names in a place where I can see if they already exist
        var reg = new RegExp("[A-Za-z]+\d+"); // Regions all have a single letter followed by digit 
        if(/[A-Za-z]+\d+/.test(data[i].location)) countryOptionsSorted[0].children.push({'id': parseInt(data[i].location_id), 'text': data[i].location_name}); // Select2 formatted push into Regions
        else countryOptionsSorted[1].children.push({'id': parseInt(data[i].location_id), 'text': data[i].location_name}); // Select2 formatted push into Countries
      }
    };

    /**
     *  Filtering Dropdowns
     */

    // Select Country
    var selectCountry = d3.select("#options")
      .append("label")
        .attr("for","selectCountry")
        .text("Region or Country: ")
      .append("select")
        .attr("name","selectCountry")
        .attr("class","selectCountry select-style")
        .on("change",updateGraphic);

    var selectCountryOptions = selectCountry
      .selectAll("optgroup")
        .data(countryOptionsSorted)
        .enter()
      .append("optgroup")
        .attr("label", function(d){return d.text})
      .selectAll("option")
        .data(function(d) {return d.children})
        .enter()
      .append("option")
        .attr("value", function(d) {return d.text})
        .text(function(d) {return d.text});

    // Select Year Dropdown
    var selectYear = d3.select("#options")
      .append("label")
        .attr("for","selectYear")
        .text("Year: ")
      .append("select")
        .attr("name","selectYear")
        .attr("class","selectYear select-style")
        .on("change",updateGraphic);

    var selectYearOptions = selectYear
      .selectAll("option")
      .data(yearOptions)
      .enter()
      .append("option")
        .text(function (d) { return d; });

    // Optional play through, I would prefer this smoother
    var playing = null;
    var playOption = d3.select("#options")
      .append("button")
        .text("Play")
        .style("cursor", "pointer")
        .on("click", function() {
          var i = 0;
          if(playing){
            clearInterval(playing);
            playing = null;
            playOption.text("Play");
          } else {
            playing = setInterval(function(){
              if (i === yearOptions.length) {
                clearInterval(playing);
                playOption.text("Play");
              }
              else {
                $('.selectYear').val(yearOptions[i]);
                updateGraphic();
                playOption.text("Stop");
              }
              i++;
            }, 750);
          }
        
        });


    // Select Sex Dropdown
    var selectSex = d3.select("#options")
      .append("label")
        .attr("for","selectSex")
        .text("Sex: ")
      .append("select")
        .attr("name","selectSex")
        .attr("class","selectSex select-style")
        .on("change",updateGraphic);

    var selectSexOptions = selectSex
      .selectAll("option")
      .data(sexOptions)
      .enter()
      .append("option")
        .text(function (d) { return d; });

    // Select BMI Dropdown
    var selectBMI = d3.select("#options")
      .append("label")
        .attr("for","selectBMI")
        .text("Classification: ")
      .append("select")
        .attr("name", "selectBMI")
        .attr("class","selectBMI select-style")
        .on("change",updateGraphic);

    var selectBMIOptions = selectBMI
      .selectAll("option")
      .data(bmiOptions)
      .enter()
      .append("option")
        .text(function (d) { return d; });

    /**
     *  SVG Container
     */

    var svgContainer = d3.select("body").select("#chart")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    
    // Arc Generators
    var arcLocal = d3.arc()
      .innerRadius(70)
      .outerRadius(90)
      .startAngle(0)
      .endAngle(function(d) {return d.mean * tau});

    var arcGlobal = d3.arc()
      .innerRadius(60)
      .outerRadius(70)
      .startAngle(0)
      .endAngle(function(d) {return d.mean * tau});    
    
    // Tooltip
    var div = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    /**
     *  Create Graphic
     */

    function createGraphic(incomingData) {

      // Split Data into Global and Local
      var localData = incomingData.filter(function(d) {return d.location !== "G" && d.location === "D0" && d.age_group_id !== "36" && d.age_group_id !== "38"});
      var localChildrenData = incomingData.filter(function(d) {return d.location !== "G" && d.location === "D0" && d.age_group_id === "36"});
      var localAdultData = incomingData.filter(function(d) {return d.location !== "G" && d.location === "D0" && d.age_group_id === "38"});
      
      var globalData = incomingData.filter(function(d) {return d.location === "G" && d.age_group_id !== "36" && d.age_group_id !== "38"});
      var globalChildrenData = incomingData.filter(function(d) {return d.location === "G" && d.age_group_id === "36"});
      var globalAdultData = incomingData.filter(function(d) {return d.location === "G" && d.age_group_id === "38"});

      // Pieces
      var arcChildren = svgContainer.append("g");
      var arcAdults = svgContainer.append("g");
      var barChart = svgContainer.append("g");
      var legend = svgContainer.append("g");

      /**
       *  Arc 1: Children 2 - 19
       */

      // Global
      arcChildren
        .data(globalChildrenData)
        .append("path")
          .attr("class", "arcChildrenGlobal global")
          .attr("d", arcGlobal)
          .each(function(d) {this._current = d})
          .on("mouseover", function(d) {
            div.transition()
              .duration(250)
              .style("opacity", .95);
            div.html("Global Prevalence: " + formatPercent(d.mean) + "<br />" + "Range: " + formatPercent(d.lower) + " - " + formatPercent(d.upper))
              .style("left", (d3.event.pageX + 20) + "px")
              .style("top", (d3.event.pageY - 30) + "px");
            })
          .on("mouseout", function(d) {
            div.transition()
              .duration(300)
              .style("opacity", 0);
           });         
      
      // Local
      arcChildren
        .data(localChildrenData)
        .append("path")
          .attr("class", "arcChildrenLocal local")
          .attr("d", arcLocal)
          .each(function(d) {this._current = d})
          .on("mouseover", function(d) {
          div.transition()
            .duration(250)
            .style("opacity", .95);
          div.html(d.location_name + " Prevalence: " + formatPercent(d.mean) + "<br />" + "Range: " + formatPercent(d.lower) + " - " + formatPercent(d.upper))
            .style("left", (d3.event.pageX + 20) + "px")
            .style("top", (d3.event.pageY - 30) + "px");
          })
        .on("mouseout", function(d) {
          div.transition()
            .duration(300)
            .style("opacity", 0);
          });
      
      // Text Global
      arcChildren
        .selectAll(".arcTextGlobalChildren")
        .data(globalChildrenData)
        .enter()
        .append("text")
          .attr("class", "arcTextGlobalChildren")
          .style("opacity", ".5")
          .text(function(d) {return formatPercent(d.mean) + " Global"})
          .attr("text-anchor", "middle")
          .attr("transform","translate(0, 20)");
      
      // Text Local
      arcChildren
        .selectAll(".arcTextChildren")
        .data(localChildrenData)
        .enter()
        .append("text")
          .attr("class", "arcTextChildren arcText")
          .text(function(d) {return formatPercent(d.mean)})
          .attr("text-anchor", "middle");
      
      // Text Title
      arcChildren
        .append("text")
          .attr("class", "arcText")
          .text("Ages 2 to 19")
          .attr("text-anchor", "middle")
          .attr("transform","translate(0, -112)");  

      // Position Children Group
      arcChildren
        .attr("transform", "translate(20, 160)")

      /**
       *  Arc 2: Adults 20+
       */

      // Global
      arcAdults
        .data(globalAdultData)
        .append("path")
          .attr("class", "arcGlobalAdults global")
          .attr("d", arcGlobal)
          .each(function(d) { this._current = d; })
          .on("mouseover", function(d) {
            div.transition()
              .duration(250)
              .style("opacity", .95);
            div.html("Global Prevalence: " + formatPercent(d.mean) + "<br />" + "Range: " + formatPercent(d.lower) + " - " + formatPercent(d.upper))
              .style("left", (d3.event.pageX + 20) + "px")
              .style("top", (d3.event.pageY - 30) + "px");
            })
          .on("mouseout", function(d) {
            div.transition()
              .duration(300)
              .style("opacity", 0);
           });       
      
      // Local
      arcAdults
        .data(localAdultData)
        .append("path")
        .attr("class", "arcAdults local")
        .attr("d", arcLocal)
        .on("mouseover", function(d) {
          div.transition()
            .duration(250)
            .style("opacity", .95);
          div.html(d.location_name + " Prevalence: " + formatPercent(d.mean) + "<br />" + "Range: " + formatPercent(d.lower) + " - " + formatPercent(d.upper))
            .style("left", (d3.event.pageX + 20) + "px")
            .style("top", (d3.event.pageY - 30) + "px");
          })
        .on("mouseout", function(d) {
          div.transition()
            .duration(300)
            .style("opacity", 0);
          });
      
      // Text Global
      arcAdults
        .selectAll(".arcTextGlobalAdults")
        .data(globalAdultData)
        .enter()
        .append("text")
          .attr("class", "arcTextGlobalAdults")
          .style("opacity", ".5")   
          .text(function(d) {return formatPercent(d.mean) + " Global"})
          .attr("text-anchor", "middle")
          .attr("transform","translate(0, 20)");
      
      // Text Local
      arcAdults
        .selectAll(".arcTextAdults")
        .data(localAdultData)
        .enter()
        .append("text")
          .attr("class", "arcTextAdults arcText")
          .text(function(d) {return formatPercent(d.mean)})
          .attr("text-anchor", "middle")
      
      //Text Title
      arcAdults
        .append("text")
          .attr("class", "arcText")
          .text("Ages 20+")
          .attr("text-anchor", "middle")
          .attr("transform","translate(0, -112)");  

      // Position Adults Group
      arcAdults
        .attr("transform", "translate(20, 440)")

      /*
       *  Bar Chart
       */

      // Bar Ranges
      var maxMeanOverweight = d3.max(incomingData, function(d) {return d.mean});
      xScale.domain([0,maxMeanOverweight]);
      yScale.domain(localData.map(function(d) {return d.age_group}));

      // Local Bars
      barChart
        .selectAll(".localBar")
        .data(localData)
        .enter()
        .append("rect")
          .attr("class", "localBar local")
          .attr("x", 0)
          .attr("width", function(d) {return xScale(d.mean)})
          .attr("y", function(d) {return yScale(d.age_group)})
          .attr("height", yScale.bandwidth())
          .on("mouseover", function(d) {
            div.transition()
              .duration(250)
              .style("opacity", .95);
            div.html(d.location_name + " Prevalence: " + formatPercent(d.mean) + "<br />" + "Range: " + formatPercent(d.lower) + " - " + formatPercent(d.upper))
              .style("left", (d3.event.pageX + 20) + "px")
              .style("top", (d3.event.pageY - 30) + "px");
            })
          .on("mouseout", function(d) {
            div.transition()
              .duration(300)
              .style("opacity", 0);
           });

      // Local Bar Labels
      barChart
        .selectAll(".localText")
        .data(localData)
        .enter()
        .append("text")
          .attr("class", "localText")
          .text(function(d) {return formatPercent(d.mean)})
            .attr("x", function(d) {return xScale(d.mean) + 16})
            .attr("y", function(d) {return yScale(d.age_group) + 20});

      // Global Average Bar
      barChart
        .selectAll(".globalline")
        .data(globalData)
        .enter()
        .append("rect")
          .attr("class", "globalline global")        
          .attr("x", 0)
          .attr("width", function(d) {return xScale(d.mean)})
          .attr("y", function(d) {return yScale(d.age_group)})
          .attr("height", yScale.bandwidth() - 22)
          .on("mouseover", function(d) {
            div.transition()
              .duration(250)
              .style("opacity", .95);
            div.html("Global Prevalence: " + formatPercent(d.mean) + "<br />" + "Range: " + formatPercent(d.lower) + " - " + formatPercent(d.upper))
              .style("left", (d3.event.pageX + 20) + "px")
              .style("top", (d3.event.pageY - 30) + "px");
            })
          .on("mouseout", function(d) {
            div.transition()
              .duration(300)
              .style("opacity", 0);
           });

      //Y-Axis
      barChart
        .append("g")
          .call(d3.axisLeft(yScale)).select(".domain").remove();

      // Position Bar Chart
      barChart
        .attr("transform", "translate(300, 0)")

      /**
       *  Legend
       */

      // Global
      legend
        .append("text")
          .attr("class", "labelGlobal label")
          .attr("text-anchor", "end")
          .text("Global Prevalence");
      
      legend
        .append("rect")
          .attr("width", 10)
          .attr("height", 10)
          .attr("class", "globalLegend global")
          .attr("transform", "translate(5, -10)");

      // Local
      legend
        .append("text")
          .data(localAdultData)
          .attr("class", "labelLocal label")
          .attr("text-anchor", "end")
          .text(function(d) {return d.location_name + " Prevalence"})
          .attr("transform", "translate(0, 20)");

      legend
        .append("rect")
          .attr("width", 10)
          .attr("height", 10)
          .attr("class", "localLegend local")
          .attr("transform", "translate(5, 10)");

      //Metric
      legend
        .append("text")
          .data(localAdultData)
          .attr("class", "labelMetric label")
          .attr("text-anchor", "end")
          .text( function (d) {
            if (d.metric === 'overweight') return "Overweight (BMI≥25)";
            else return "Obese (BMI≥30)"
          })
          .attr("transform", "translate(14, 40)");
    
      // Color Pallette Switch, more colorblind friendly
      legend
        .append("text")
          .data(localAdultData)
          .attr("class", "labelColor label")
          .attr("text-anchor", "end")
          .text("Change Pallette")
          .attr("transform", "translate(14, 60)")
          .style("cursor", "pointer")
          .on("click", function() {
            var state = d3.selectAll(".localBar").classed("cb-light");
            d3.selectAll(".local").classed("cb-light", !state);
            d3.selectAll(".global").classed("cb-dark", !state);
          });

      // Postition Legend
      legend
        .attr("transform", "translate(860, 550)");

    };  // end createGraphic()

    /*
     * Update Graphic on changes to select dropdowns
     */

    function updateGraphic(){
      selectedYear = d3.select(".selectYear").property("value") || stepThroughYear;
      selectedSex = d3.select(".selectSex").property("value");
      selectedCountry = d3.select(".selectCountry").property("value");
      selectedBmi = d3.select(".selectBMI").property("value");

      var localData = data.filter(function(d) {return d.location !== "G"});
      var globalData = data.filter(function(d) {return d.location === "G"});
      
      var newlocalData = localData.filter(function(d) {return d.year === selectedYear && d.sex === selectedSex && d.metric === selectedBmi && d.location_name === selectedCountry && d.age_group_id !== "36" && d.age_group_id !== "38"});
      var newLocalChildrenData = localData.filter(function(d) {return d.year === selectedYear && d.sex === selectedSex && d.metric === selectedBmi && d.location_name === selectedCountry && d.location !== "G" && d.age_group_id === "36"});
      var newLocalAdultData = localData.filter(function(d) {return d.year === selectedYear && d.sex === selectedSex && d.metric === selectedBmi && d.location_name === selectedCountry && d.location !== "G" && d.age_group_id === "38"});

      var newGlobalData = globalData.filter(function(d) {return d.year === selectedYear && d.sex === selectedSex && d.metric === selectedBmi && d.age_group_id !== "36" && d.age_group_id !== "38"});
      var newGlobalChildrenData = globalData.filter(function(d) {return d.year === selectedYear && d.sex === selectedSex && d.metric === selectedBmi && d.age_group_id === "36"});
      var newGlobalAdultData = globalData.filter(function(d) {return d.year === selectedYear && d.sex === selectedSex && d.metric === selectedBmi && d.age_group_id === "38"});

      var maxMeanOverweight = d3.max(data,function(d) {return d.mean});
      xScale.domain([0,maxMeanOverweight]);
      yScale.domain(newlocalData.map(function(d) {return d.age_group}));

      // Update Arcs
      d3.selectAll("path.arcChildrenGlobal")
        .data(newGlobalChildrenData)
          .transition()
            .duration(250)
            .attrTween("d", arcTweenGlobal);
      
      d3.selectAll("path.arcChildrenLocal")
        .data(newLocalChildrenData)
          .transition()
            .duration(250)
            .attrTween("d", arcTween);
      
      d3.select("text.arcTextGlobalChildren")
        .data(newGlobalChildrenData)
          .text(function(d) {return formatPercent(d.mean) + " Global"});
      
      d3.select("text.arcTextChildren")
        .data(newLocalChildrenData)
          .text(function(d) {return formatPercent(d.mean)});

      d3.selectAll("path.arcGlobalAdults")
        .data(newGlobalAdultData)
          .transition()
            .duration(250)
            .attrTween("d", arcTweenGlobal);
      
      d3.selectAll("path.arcAdults")
        .data(newLocalAdultData)
          .transition()
            .duration(250)
            .attrTween("d", arcTween);
      
      d3.select("text.arcTextGlobalAdults")
        .data(newGlobalAdultData)
          .text(function(d) {return formatPercent(d.mean) + " Global"});
      
      d3.select("text.arcTextAdults")
        .data(newLocalAdultData)
          .text(function(d) {return formatPercent(d.mean)});

      // Update Bars
      d3.selectAll("rect.localBar")
        .data(newlocalData)
        .transition()
          .duration(250)
          .attr("width", function(d) {return xScale(d.mean)});
      
      d3.selectAll("text.localText")
        .data(newlocalData)
          .text(function(d) {return formatPercent(d.mean)})
            .transition()
            .duration(250)
            .attr("x", function(d) {return xScale(d.mean) + 16});
      
      d3.selectAll("rect.globalline")
        .data(newGlobalData)
        .transition()
          .duration(250)
          .attr("x", 0)
          .attr("width", function(d) {return xScale(d.mean)});

      // Update Label
      d3.selectAll("text.labelLocal")
        .data(newlocalData)
          .text( function(d) {return d.location_name + " Prevalence"});
      
      d3.selectAll("text.labelMetric")
        .data(newlocalData)
          .text( function (d) {
            if (d.metric === 'overweight') return "Overweight (BMI≥25)";
            else return "Obese (BMI≥30)"
          })

    }; // end updateGraphic()

    // Run once with preset data
    createGraphic(data.filter(function(d) {return d.year === selectedYear && d.sex_id === "1" && d.metric === "overweight"}));

    // Using Select2 for a searchable selection of country/region
    $('.selectCountry').select2({ width: '224px' });
    $('.selectCountry').on("change", function (e) { updateGraphic(); });

    // Arc animations
    function arcTween(a) {
      var i = d3.interpolate(this._current, a);
      this._current = i(0);
      return function(t) {
        return arcLocal(i(t));
      };
    }

    function arcTweenGlobal(a) {
      var i = d3.interpolate(this._current, a);
      this._current = i(0);
      return function(t) {
        return arcGlobal(i(t));
      };
    };

  });
};