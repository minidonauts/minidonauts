let eventZipCode;
let eventDrivingTime;
let eventDrivingDistance;

function recalculateEventCosts() {
    let currEventZipCode = $("#event-zip").val() == "" ? "60137" : $("#event-zip").val();
    let eventHours = Number($("#event-hours").val() == "" ? "1" : $("#event-hours").val());
    $("#event-zip").val(currEventZipCode);
    $("#event-hours").val(eventHours);

    if (eventZipCode != currEventZipCode) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", "https://dev.virtualearth.net/REST/V1/Routes/Driving?o=xml&wp.0=60515&wp.1=" + currEventZipCode + "&avoid=minimizeTolls&distanceUnit=Mile&key=AivfjGjefdrScaP3qQkrt8yfJqbhMz86eKb64S-QtpDCpDXggu-t78l872rlgDrL", false); // false for synchronous request
        xmlHttp.send(null);

        let xmlDoc = xmlHttp.responseXML;
        eventDrivingDistance = Number(xmlDoc.getElementsByTagName('TravelDistance')[0].innerHTML);
        let eventDrivingSeconds = Number(xmlDoc.getElementsByTagName('TravelDuration')[0].innerHTML);
        eventDrivingTime = eventDrivingSeconds / 60 / 60;
    }

    let setupHours = 1.5;
    let taredownHours = 1.5;
    let totalHoursAway = eventHours + setupHours + taredownHours + (eventDrivingTime * 2);
    let eventStart = Number($("#event-start").val());
    let leaveBy = eventStart - setupHours - eventDrivingTime;
    let backBy = eventStart + eventHours + taredownHours + eventDrivingTime;
    let bagsPerHour = 1200 / 12;
    let avgServing = bagsPerHour * eventHours;
    let servingPerMix = 14;
    let batchesNeeded = Math.ceil(avgServing / servingPerMix);

    //#region Costs
    let carDollarPerMile = 0.22;
    let costCarGas = carDollarPerMile * eventDrivingDistance * 2;
    let generatorDollarPerHr = 4 / 6;
    let gasPrice = 4;
    let costGeneratorGas = (2 + eventHours) * generatorDollarPerHr * gasPrice;
    let batchesPerMixBag = 21;
    let mixBagCost = 87.49;
    let costDonutMix = (mixBagCost / batchesPerMixBag) * batchesNeeded;
    let batchesPerOil = 3 * 6;
    let oilCost = 68.49;
    let costOil = (oilCost / batchesPerOil) * batchesNeeded;
    let waterBottlesPerCase = 35;
    let waterBottlesCaseCost = 6.89 * 1.25;
    let costWater = (waterBottlesCaseCost / waterBottlesPerCase) * batchesNeeded;


    let dayOfTheWeek = $("#event-day-of-week").val();
    let relatedAvailabilityStart = 0;
    let relatedAvailabilityEnd = 24;
    switch (dayOfTheWeek) {
        case "Saturday":
            relatedAvailabilityStart = 16;
            relatedAvailabilityEnd = 22;
            break;
        case "Sunday":
            relatedAvailabilityStart = 14.5;
            relatedAvailabilityEnd = 23.5;
            break;
    }
    let tooEarly = relatedAvailabilityStart > leaveBy;
    let tooLate = backBy > relatedAvailabilityEnd;
    let opportunityCostMultiplier = 0;
    if (tooEarly) {
        opportunityCostMultiplier++;
    }
    if (tooLate) {
        opportunityCostMultiplier++;
    }
    let costOpportunityCost = 496.33 * opportunityCostMultiplier;


    //#endregion
    let operatingCost = costCarGas + costGeneratorGas + costDonutMix + costOil + costWater + costOpportunityCost;

    let goalWageBeforeTaxes = 45.12;
    let chefsEmployeed = 2;
    let hourlyRate = goalWageBeforeTaxes * chefsEmployeed;

    let eventCost = (totalHoursAway * hourlyRate) + operatingCost;
    let eventCostRounded = Math.ceil(eventCost / 100) * 100;

    $('#event-cost').text(`$${eventCostRounded}.00`);
}

recalculateEventCosts();