// # Basic income and basic job models
// -----------------------------------

// ## Constants
// ------------

// From 2010 census
var numAdults = 227e6;

// Minimum wage, 40 hours/week, 50 weeks/year
var basicIncome = 7.25 * 40 * 50;

// Also from 2010
var laborForce = 154e6;

// Also from 2010
var disabledAdults = 21e6;

// Also from 2010, includes SS, Medicare, welfare, etc.
var currentWealthTransfers = 3369e9;

// ## Basic income model
// ---------------------

// Each time this function is called, the model will be run once. Because there is randomness in the model, the output will vary. Later, this function will be run many times to assess the full range of possible outcomes.
function basicIncomeCostBenefit() {
    // This object will store all the costs and benefits of the basic income as key/value pairs.
    var amounts = {};

    // Assume we have some kind of phase out, like with a negative income tax
    amounts.directCosts = numAdults * basicIncome / 2;

    // Small random administrative cost
    var administrativeCostPerPerson = gaussRand(250, 75);
    amounts.administrativeCosts = numAdults * administrativeCostPerPerson;

    // Will basic income increase the labor force or decrease it? Not sure
    var nonWorkerMultiplier = uniformRand(-0.10, 0.15);
    var nonWorkers = (numAdults - laborForce - disabledAdults) * (1 + nonWorkerMultiplier);

    // How will basic income change the productivity of current workers?
    var avgHourlyWage = 25;
    var productivityMultiplier = uniformRand(-0.1, 0.2);
    amounts.productivity = -laborForce * (40 * 52 * avgHourlyWage) * productivityMultiplier;

    // Basic income will allow some small number of creative geniuses to maximize their talents
    amounts.jkRowling = -binomRand(nonWorkers, 1e-7) * 1e9;

    return amounts;
}

// ## Basic job model
// ------------------

// Like the basic income model, this function will run the model once each time it is called. The output of this function is the same format as `basicIncomeCostBenefit`, so the results can be easily compared.
function basicJobCostBenefit() {
    var amounts = {};

    // Will basic job increase the labor force or decrease it? Not sure
    var nonWorkerMultiplier = uniformRand(-0.1, 0.15);
    var numBasicWorkers = (numAdults - disabledAdults - laborForce) * (1 + nonWorkerMultiplier);

    // Overall direct costs
    amounts.directCosts = numBasicWorkers * basicIncome;

    // Some cost for disabled people who can't work
    var administrativeCostPerDisabledPerson = gaussRand(500, 150);
    amounts.disabled = disabledAdults * (basicIncome + administrativeCostPerDisabledPerson);

    // Some cost to run the program
    var administrativeCostPerWorker = gaussRand(5000, 1500);
    amounts.administrativeCosts = numBasicWorkers * administrativeCostPerWorker;

    // Can productive work actually be done in this scheme?
    var basicJobHourlyProductivity = uniformRand(-7.25, 7.25);
    amounts.productivity = -numBasicWorkers * (40 * 50 * basicJobHourlyProductivity);

    return amounts;
}

// ## Run models and aggregate results
// ----------------------------------

var biAmounts = [];
var biTotals = [];
var bjAmounts = [];
var bjTotals = [];
var biAmountsAvg;
var bjAmountsAvg;

function run() {
    var N = 1000;
    for (var i = 0; i < N; i++) {
        biAmounts[i] = basicIncomeCostBenefit();
        biTotals[i] = Object.keys(biAmounts[i]).reduce(function (total, key) {
            return biAmounts[i][key] / 1e12 + total;
        }, 0);

        bjAmounts[i] = basicJobCostBenefit();
        bjTotals[i] = Object.keys(bjAmounts[i]).reduce(function (total, key) {
            return bjAmounts[i][key] / 1e12 + total;
        }, 0);
    }

    function amountsAvgReducer(avg, amounts) {
        Object.keys(amounts).forEach(function (key) {
            if (avg.hasOwnProperty(key)) {
                avg[key] += amounts[key] / N;
            } else {
                avg[key] = amounts[key] / N;
            }
        });

        return avg;
    }

    biAmountsAvg = biAmounts.reduce(amountsAvgReducer, {});
    bjAmountsAvg = bjAmounts.reduce(amountsAvgReducer, {});

    render();
}

function render() {
    bars('biBars', biAmountsAvg, bjAmountsAvg);
    bars('bjBars', bjAmountsAvg, biAmountsAvg);

    histogram('biHist', biTotals);
    histogram('bjHist', bjTotals);
}

run();

// The histograms need to be re-rendered when the size of the window changes, otherwise they won't fit in the window correctly
window.addEventListener('resize', render);

// ## Display results
// -----------------

// Plot one of the histograms, showing the distribution of possible costs
function histogram(containerId, values) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';

    var margin = {top: 10, right: 30, bottom: 45, left: 30},
        width = container.offsetWidth - margin.left - margin.right,
        height = 200 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .domain([0, 4])
        .range([0, width]);

    // Generate a histogram with 10 evenly-spaced bins from input values
    var data = d3.layout.histogram()
        .bins(x.ticks(10))(values);

    var y = d3.scale.linear()
        .domain([0, d3.max(data, function (d) { return d.y; })])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom');

    var svg = d3.select('#' + containerId).append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var bar = svg.selectAll('.bar')
        .data(data)
        .enter().append('g')
        .attr('class', 'bar')
        .attr('transform', function (d) { return 'translate(' + x(d.x) + ',' + y(d.y) + ')'; });

    bar.append('rect')
        .attr('x', 1)
        .attr('width', x(data[0].dx) - 1)
        .attr('height', function (d) { return height - y(d.y); });

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('text')
        .attr('transform', 'translate(' + (width / 2) + ' ,' + (height + margin.bottom - 5) + ')')
        .style('text-anchor', 'middle')
        .text('Cost (trillions of dollars)');
}

// Plot one of the bar graphs, showing the average contribution of different components to the total cost
function bars(containerId, amounts, amounts2) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';

    var width = 100;

    var categories = Object.keys(amounts).sort();
    var values = categories.map(function (category) {
        return amounts[category];
    });

    var categories2 = Object.keys(amounts2).sort();
    var values2 = categories2.map(function (category) {
        return amounts2[category];
    });

    var maxValue = Math.max.apply(Math, values.concat(values2));
    var minValue = Math.min.apply(Math, values.concat(values2));

    var zero;
    if (minValue > 0 || maxValue < 0) {
        zero = 0;
    } else {
        zero = -minValue * 100 / (maxValue - minValue);
    }

    var data = [];
    values.forEach(function (value, i) {
        var scaled = value * 100 / (maxValue - minValue);
        var width = Math.abs(scaled);
        var sign = Math.sign(scaled);

        data.push({
            value: value,
            offset: sign === 1 ? zero : zero + scaled,
            width: width,
            sign: sign,
            category: categories[i]
        });
    });

    var div = d3.select('#tooltip')
        .style('opacity', 0);

    var rows = d3.select('#' + containerId)
        .selectAll('table')
        .data(data)
        .enter().append('tr');

    rows.append('td')
        .html(function (d) { return d.category; });

    rows.append('td')
        .on('mouseover', function (d) {
            div.style('opacity', 0.9);
            div.html(function () {
                    if (d.sign === 1) {
                        return 'Costs $' + (d.value / 1e12).toFixed(2) + ' trillion';
                    }
                    return 'Reduces costs $' + (-d.value / 1e12).toFixed(2) + ' trillion';
                })
               .style('left', (d3.event.pageX + 15) + 'px')
               .style('top', (d3.event.pageY) + 'px');
        })
        .on('mouseout', function (d) {
            div.style('opacity', 0);
        })
        .append('div')
        .style('width', function (d) { return d.width + 'px'; })
        .style('height', '1em')
        .style('margin-left', function (d) { return d.offset + 'px'; })
        .style('background-color', function (d) { return d.sign === 1 ? 'red' : 'black'; });
}

// ## Utility functions
// --------------------

// Because JavaScript's ecosystem is a wasteland, I wrote some helper functions for generating the random numbers used in the models

function uniformRand(min, max) {
    return Math.random() * (max - min) + min;
}

function gaussRand(mu, sigma) {
    var marsaglia, radius, z1, z2;

    mu = mu !== undefined ? mu : 0;
    sigma = sigma !== undefined ? sigma : 1;

    do {
        z1 = 2 * Math.random() - 1;
        z2 = 2 * Math.random() - 1;
        radius = z1 * z1 + z2 * z2;
    } while (radius >= 1 || radius === 0);

    marsaglia = Math.sqrt(-2 * Math.log(radius) / radius);

    return (z1 * marsaglia) * sigma + mu;
}

function binomRand(N, p) {
    var count = Math.round(gaussRand(N * p, Math.sqrt(N * p * (1 - p))));
    return count > 0 ? count : 0;
}