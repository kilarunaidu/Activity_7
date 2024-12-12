function scatter_plot(data,
    ax,
    title="",
    xCol="",
    yCol="",
    rCol="",
    legend=[],
    colorCol="",
    margin = 50)
{
    const X = data.map(d=>d[xCol])
    const Y = data.map(d=>d[yCol])
    const R = data.map(d=>d[rCol])
    const colorCategories = [... new Set(data.map(d=>d[colorCol]))]
    const color = d3.scaleOrdinal()
        .domain(colorCategories)
        .range(d3.schemeTableau10)

    const xExtent = d3.extent(X, d => +d);
    const yExtent = d3.extent(Y, d => +d);

    const xMargin = (xExtent[1] - xExtent[0]) * 0.05;
    const yMargin = (yExtent[1] - yExtent[0]) * 0.05;

    const xScale = d3.scaleLinear()
        .domain([xExtent[0] - xMargin, xExtent[1] + xMargin])
        .range([margin, 1000 - margin]);

    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yMargin, yExtent[1] + yMargin])
        .range([1000 - margin, margin]);

    const rScale = d3.scaleSqrt().domain(d3.extent(R, d=>+d))
        .range([4,12])
    const Fig = d3.select(`${ax}`)

    Fig.selectAll('.markers')
        .data(data)
        .join('g')
        .attr('transform', d=>`translate(${xScale(d[xCol])}, ${yScale(d[yCol])})`)
        .append('circle')
        .attr("class", (d,i)=>`cls_${i} ${d[colorCol]}`)
        .attr("id", (d,i)=>`id_${i} ${d[colorCol]}`)
        .attr("r",d=>rScale(d[rCol]))
        .attr("fill", d=> color(d[colorCol]))

    // x and y Axis function
    const x_axis = d3.axisBottom(xScale).ticks(4)
    const y_axis = d3.axisLeft(yScale).ticks(4)

    //X Axis
    Fig.append("g").attr("class","axis")
        .attr("transform", `translate(${0},${1000-margin})`)
        .call(x_axis)

    // Y Axis
    Fig.append("g").attr("class","axis")
        .attr("transform", `translate(${margin},${0})`)
        .call(y_axis)

    // Labels
    Fig.append("g").attr("class","label")
        .attr("transform", `translate(${500},${1000-10})`)
        .append("text")
        .attr("class","label")
        .text(xCol)
        .attr("fill", "black")

    Fig.append("g")
        .attr("transform", `translate(${35},${500}) rotate(270)`)
        .append("text")
        .attr("class","label")
        .text(yCol)
        .attr("fill", "black")

    // Title
    Fig.append('text')
        .attr('x',500)
        .attr('y',80)
        .attr("text-anchor","middle")
        .text(title)
        .attr("class","title")
        .attr("fill", "black")

    // Brush functionality
    const brush = d3.brush()
        .on("start", brushStart)
        .on("brush end", brushed)
        .extent([[margin, margin], [1000-margin,1000-margin]]);

    Fig.call(brush);

    function brushStart() {
        if (d3.brushSelection(this)[0][0] === d3.brushSelection(this)[1][0]) {
            d3.selectAll("circle").classed("selected", false);
        }
    }

    function brushed() {
        let selected_coordinates = d3.brushSelection(this);
        if (!selected_coordinates) return;

        const X1 = xScale.invert(selected_coordinates[0][0]);
        const X2 = xScale.invert(selected_coordinates[1][0]);
        const Y1 = yScale.invert(selected_coordinates[0][1]);
        const Y2 = yScale.invert(selected_coordinates[1][1]);

        d3.selectAll("circle").classed("selected", (d, i) => {
            return +d[xCol] >= X1 && +d[xCol] <= X2 && +d[yCol] <= Y1 && +d[yCol] >= Y2;
        });
    }

    // Legend setup
    const legendContainer = Fig
        .append("g")
        .attr("transform", `translate(${800},${margin})`)
        .attr("class","marginContainer")

    if(legend.length === 0) {
        legend = colorCategories
    }

    // Track deselected categories globally
    if (typeof window.deselectedCategories === 'undefined') {
        window.deselectedCategories = new Set();
    }

    const legends_items = legendContainer.selectAll("legends")
        .data(legend)
        .join("g")
        .attr("transform",(d,i)=>`translate(${0},${i*45})`)

    legends_items.append("rect")
        .attr("fill",d=>color(d))
        .attr("width","40")
        .attr("height","40")
        .attr("class",d=>d)
        .style("stroke", "none")
        .classed("selected", true)
        .on("click", function(event, d) {
            const selectedClass = d;
            const rect = d3.select(this);
            const isCurrentlySelected = !window.deselectedCategories.has(selectedClass);

            if (isCurrentlySelected) {
                // Deselect this category
                window.deselectedCategories.add(selectedClass);
                rect.classed("selected", false);
            } else {
                // Select this category
                window.deselectedCategories.delete(selectedClass);
                rect.classed("selected", true);
            }

            // Update circles visibility in BOTH plots
            d3.selectAll("svg circle")
                .style("opacity", function(data) {
                    return window.deselectedCategories.has(data[colorCol]) ? 0.2 : 1;
                });

            // Update ALL legend items opacity
            d3.selectAll(".marginContainer rect")
                .style("opacity", function(d) {
                    return window.deselectedCategories.has(d) ? 0.2 : 1;
                })
                .classed("selected", function(d) {
                    return !window.deselectedCategories.has(d);
                });
        })
        .on("mouseover", function() {
            d3.select(this)
                .style("filter", "brightness(0.9)");
        })
        .on("mouseout", function() {
            d3.select(this)
                .style("filter", null);
        });

    // Initial state update
    legends_items.selectAll("rect")
        .style("opacity", d => window.deselectedCategories.has(d) ? 0.2 : 1)
        .classed("selected", d => !window.deselectedCategories.has(d));

    legends_items
        .append("text")
        .text(d=>d)
        .attr("dx",45)
        .attr("dy",25)
        .attr("class","legend")
        .attr("fill", "black")
}

// Event listener for updating selected points list
document.addEventListener("mousemove", event => {
    const listBox = d3.select("#selected-list");
    const selectedPoints = d3.select("#figure1").selectAll("circle.selected");
    
    listBox.selectAll("li").remove();

    if (!selectedPoints.empty()) {
        const uniqueData = [...new Set(selectedPoints.data().map(d => JSON.stringify(d)))]
            .map(d => JSON.parse(d));
            
        listBox.selectAll(".listVals")
            .data(uniqueData)
            .enter()
            .append("li")
            .attr("class", "listVals")
            .text(d => `${d.Model} - ${d.Type}`);
    }
});