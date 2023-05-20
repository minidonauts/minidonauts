function sendEmail() {
    var email = 'minidonauts@gmail.com';
    var subject = 'Blast Off with Mini Donauts: Reservation Inquiry';
    var emailBody = "Hi,\n" +
        `To provide a better idea of my event, here is some extra details:\n` +
        `\tCity/Zipcode: \n` +
        `\tTime donuts should start to be served: \n` +
        `\tDuration of donut production: \n` +
        `\tEstimated number of guests: \n` +
        `\n`;
    var attach = 'path';
    document.location = "mailto:" + email + "?subject=" + subject + "&body=" + emailBody +
        "?attach=" + attach;
}


// const GoogleSpreadsheet = require('google-spreadsheet');
// const { promisify } = require('util');

// const creds = require('./client_secret.json');

// async function accessSheet() {
//     const doc = new GoogleSpreadsheet('1PMDGbY8EAc_2D6k9bPj4Tq3phQjmE9UpVW0OuMgfH1M');

//     await promisify(doc.useServiceAccountAuth)(creds);
//     const info = await promisify(doc.getInfo)();
//     const sheet = info.worksheets[0];

//     const rows = await promisify(sheet.getRows)({
//         offset: 1
//     });

//     console.log(rows);
// }

// function sendEmail() {
//     const emailAddress = $('#user-email-address').val();
//     const eventAddress = $('#event-address').val();
//     const eventDate = $('#event-date').val();
//     const eventTime = $('#event-start option:selected')[0].text;
//     const eventHours = $('#event-hours').val();
//     const eventZip = $('#event-zip').val();

//     var isValid= true;
//     if(emailAddress==""){
//         $('#user-email-address-invalid').text("Email Address is required");
//         isValid = false;
//     }
//     if(eventHours=="" || eventHours=="-" || eventHours==0){
//         $('#event-hours-invalid').text("Hour(s) are required");
//         isValid = false;
//     } else {
//         $('#event-hours-invalid').text("");
//     }
//     if(eventAddress==""){
//         $('#event-address-invalid').text("Address of Event is required");
//         isValid = false;
//     } else {
//         $('#event-address-invalid').text("");
//     }
//     if(eventDate==""){
//         $('#event-date-invalid').text("Date of Event is required");
//         isValid = false;
//     } else {
//         $('#event-date-invalid').text("");
//     }
//     if(eventZip==""){
//         $('#event-zip-invalid').text("Zipcode of Event is required");
//         isValid = false;
//     } else {
//         $('#event-zip-invalid').text("");
//     }

//     if (isValid) {
//         sendToExcel(eventDate, eventAddress, eventHours, eventTime, eventZip);

//         // var htmlString = document.getElementById('reservation-email-template').innerHTML;
//         // htmlString = htmlString.replace("{{EventAddress}}",eventAddress);
//         // htmlString = htmlString.replace("{{EventDateAndTime}}",eventTime+" on "+eventDate);
//         // htmlString = htmlString.replace("{{EventHours}}",eventHours + " hr(s)");

//         // Email.send({
//         //     SecureToken: "56ffec6d-82d6-44a4-ad77-9d33260d33cc",
//         //     To: emailAddress,
//         //     Cc: 'minidonauts@gmail.com',
//         //     From: 'minidonauts@gmail.com',
//         //     Subject: "Mini Donauts Reservation",
//         //     Body: htmlString
//         // }).then(
//         //     message => {
//         //         location.href="reservation-made.html";
//         //     }
//         // );        
//     }
// }

// function sendToExcel(eventDate, eventAddress, eventLength, eventStart, eventZip){
//     var {eventDrivingDistance, eventCostRounded, batchesNeeded, leaveBy, OilNeeded, waterNeeded} = calculateEventCosts(Number(eventStart), Number(eventDate), eventZip, eventLength);

//     var newRow = {
//         eventDate: eventDate,
//         eventAddress: eventAddress,
//         eventLength: eventLength,
//         eventStart: eventStart,
//         eventDrivingDistance: eventDrivingDistance,
//         eventCostRounded: eventCostRounded,
//         batchesNeeded: batchesNeeded,
//         leaveBy: leaveBy,
//         OilNeeded: OilNeeded,
//         waterNeeded: waterNeeded
//     };

//     accessSheet();
// }

// function calculateEventCosts(eventStart, eventDate, eventZipCode, eventHours) {

//     var xmlHttp = new XMLHttpRequest();
//     xmlHttp.open("GET", "https://dev.virtualearth.net/REST/V1/Routes/Driving?o=xml&wp.0=60515&wp.1=" + eventZipCode + "&avoid=minimizeTolls&distanceUnit=Mile&key=AivfjGjefdrScaP3qQkrt8yfJqbhMz86eKb64S-QtpDCpDXggu-t78l872rlgDrL", false); // false for synchronous request
//     xmlHttp.send(null);

//     let xmlDoc = xmlHttp.responseXML;
//     let eventDrivingDistance = Number(xmlDoc.getElementsByTagName('TravelDistance')[0].innerHTML);
//     let eventDrivingSeconds = Number(xmlDoc.getElementsByTagName('TravelDuration')[0].innerHTML);
//     let eventDrivingTime = eventDrivingSeconds / 60 / 60;

//     let setupHours = 1.5;
//     let taredownHours = 1.5;
//     let totalHoursAway = eventHours + setupHours + taredownHours + (eventDrivingTime * 2);
//     let leaveBy = eventStart - setupHours - eventDrivingTime;
//     let backBy = eventStart + eventHours + taredownHours + eventDrivingTime;
//     let bagsPerHour = 1200 / 12;
//     let avgServing = bagsPerHour * eventHours;
//     let servingPerMix = 14;
//     let batchesNeeded = Math.ceil(avgServing / servingPerMix);

//     //#region Costs
//     let carDollarPerMile = 0.22;
//     let costCarGas = carDollarPerMile * eventDrivingDistance * 2;
//     let generatorDollarPerHr = 4 / 6;
//     let gasPrice = 4;
//     let costGeneratorGas = (2 + eventHours) * generatorDollarPerHr * gasPrice;
//     let batchesPerMixBag = 21;
//     let mixBagCost = 87.49;
//     let costDonutMix = (mixBagCost / batchesPerMixBag) * batchesNeeded;
//     let batchesPerOil = 3 * 6;
//     let oilCost = 68.49;
//     let costOil = (oilCost / batchesPerOil) * batchesNeeded;
//     let waterBottlesPerCase = 35;
//     let waterBottlesCaseCost = 6.89 * 1.25;
//     let costWater = (waterBottlesCaseCost / waterBottlesPerCase) * batchesNeeded;


//     var day = new Date(eventDate).getDay();
//     let relatedAvailabilityStart = 0;
//     let relatedAvailabilityEnd = 24;
//     switch (day) {
//         case 6: // Saturday
//             relatedAvailabilityStart = 16;
//             relatedAvailabilityEnd = 22;
//             break;
//         case 0: // Sunday
//             relatedAvailabilityStart = 14.5;
//             relatedAvailabilityEnd = 23.5;
//             break;
//     }
//     let tooEarly = relatedAvailabilityStart > leaveBy;
//     let tooLate = backBy > relatedAvailabilityEnd;
//     let opportunityCostMultiplier = 0;
//     if (tooEarly) {
//         opportunityCostMultiplier++;
//     }
//     if (tooLate) {
//         opportunityCostMultiplier++;
//     }
//     let costOpportunityCost = 496.33 * opportunityCostMultiplier;


//     //#endregion
//     let operatingCost = costCarGas + costGeneratorGas + costDonutMix + costOil + costWater + costOpportunityCost;

//     let goalWageBeforeTaxes = 45.12;
//     let chefsEmployeed = 2;
//     let hourlyRate = goalWageBeforeTaxes * chefsEmployeed;

//     let eventCost = (totalHoursAway * hourlyRate) + operatingCost;
//     let eventCostRounded = Math.ceil(eventCost / 100) * 100;

//     return eventCostRounded;
// }


// const bookedDates = [];//"05-07-2022"];
// function disableDates(date) {
//     var string = $.datepicker.formatDate('mm-dd-yy', date);
//     var isBookedDate = bookedDates.indexOf(string) != -1;

//     var filterDate = new Date(string);
//     var day = filterDate.getDay();
//     var isWeekDay = day != 0 && day !=6;

//     return [!isBookedDate && !isWeekDay];
// }
// $("#event-date").datepicker({
//     beforeShowDay: disableDates
// });

// const validateEmail = (email) => {
//     return email.match(
//         /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
//     );
// };

// $("#user-email-address").keyup(function () {
//     const $result = $('#user-email-address-invalid');
//     const email = $('#user-email-address').val();
//     $result.text('');

//     if (validateEmail(email)) {
//         $result.text('');
//     } else {
//         $result.text('email address is invalid');
//     }
//     return false;
// });