function downloadQuote() {
    const card = document.getElementById('quote-card');
    html2canvas(card, { scale: 2, useCORS: true, backgroundColor: null }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'mini-donauts-quote.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

let eventZipCode;
let eventDrivingTime;
let eventDrivingDistance;

// Cost constants
const CAR_CENTS_PER_MILE = 0.22;
const GEN_GAL_PER_HR     = 4 / 6;
const GAS_PRICE          = 4;
const MIX_BAG_COST       = 87.49;
const BATCHES_PER_BAG    = 21;
const OIL_COST           = 68.49;
const BATCHES_PER_OIL    = 18;
const WATER_CASE_COST    = 6.89 * 1.25;
const WATER_PER_CASE     = 35;
const SERVINGS_PER_BATCH  = 14;  // bags of donuts per batch of mix
const BAGS_PER_HOUR       = 75;  // realistic serving capacity
const CAPACITY_PER_HOUR   = 75;  // max guests per hour for Ticketed
const SETUP_HRS          = 1.5;
const TEARDOWN_HRS       = 1.5;
const WAGE_PER_HR        = 45.12 * 2;  // 2 chefs

function nonServiceHours() {
    return SETUP_HRS + TEARDOWN_HRS + eventDrivingTime * 2;
}

function travelCost(serviceHours) {
    const carGas = CAR_CENTS_PER_MILE * eventDrivingDistance * 2;
    const genGas = (SETUP_HRS + serviceHours + TEARDOWN_HRS) * GEN_GAL_PER_HR * GAS_PRICE;
    return carGas + genGas;
}

function ingredientCost(batches) {
    const mix   = (MIX_BAG_COST / BATCHES_PER_BAG) * batches;
    const oil   = (OIL_COST / BATCHES_PER_OIL) * batches;
    const water = (WATER_CASE_COST / WATER_PER_CASE) * batches;
    return mix + oil + water;
}

// AYCE: full production capacity, host pays everything
function calculateAYCE(hours) {
    const batches      = Math.ceil(BAGS_PER_HOUR * hours / SERVINGS_PER_BATCH);
    const totalHrsAway = hours + nonServiceHours();
    return travelCost(hours) + ingredientCost(batches) + totalHrsAway * WAGE_PER_HR;
}

// Ticketed: exactly 1 bag per guest, ingredients based on headcount
function calculateTicketed(hours, guests) {
    const batches      = Math.ceil(guests / SERVINGS_PER_BATCH);
    const totalHrsAway = hours + nonServiceHours();
    return travelCost(hours) + ingredientCost(batches) + totalHrsAway * WAGE_PER_HR;
}

// Landing: host pays travel + setup/teardown labor only — service time earned via direct sales
function calculateLanding(hours) {
    return travelCost(hours) + nonServiceHours() * WAGE_PER_HR;
}

function recalculateEventCosts() {
    let currZip = $("#event-zip").val().trim();
    if (currZip.length !== 5 || isNaN(currZip)) return;
    const guests = Math.max(1, Number($("#event-guests").val()) || 50);

    if (eventZipCode !== currZip) {
        try {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.open("GET", "https://dev.virtualearth.net/REST/V1/Routes/Driving?o=xml&wp.0=60559&wp.1=" + currZip + "&avoid=minimizeTolls&distanceUnit=Mile&key=AivfjGjefdrScaP3qQkrt8yfJqbhMz86eKb64S-QtpDCpDXggu-t78l872rlgDrL", false);
            xmlHttp.send(null);
            const xmlDoc = xmlHttp.responseXML;
            eventDrivingDistance = Number(xmlDoc.getElementsByTagName('TravelDistance')[0].innerHTML);
            eventDrivingTime     = Number(xmlDoc.getElementsByTagName('TravelDuration')[0].innerHTML) / 3600;
            eventZipCode = currZip;
        } catch (e) {
            if (eventDrivingDistance == null) {
                eventDrivingDistance = 20;
                eventDrivingTime = 0.5;
            }
        }
    }

    const fmt = (n) => `$${Math.ceil(n)}`;

    $('#q-ayce-1').text(fmt(calculateAYCE(1)));
    $('#q-ayce-2').text(fmt(calculateAYCE(2)));
    $('#q-ayce-3').text(fmt(calculateAYCE(3)));

    $('#q-tick-1').text(guests <= CAPACITY_PER_HOUR * 1 ? fmt(calculateTicketed(1, guests)) : '—');
    $('#q-tick-2').text(guests <= CAPACITY_PER_HOUR * 2 ? fmt(calculateTicketed(2, guests)) : '—');
    $('#q-tick-3').text(guests <= CAPACITY_PER_HOUR * 3 ? fmt(calculateTicketed(3, guests)) : '—');

    $('#q-land-1').text(fmt(calculateLanding(1)));
    $('#q-land-2').text(fmt(calculateLanding(2)));
    $('#q-land-3').text(fmt(calculateLanding(3)));

    $('#q-event-info').text(`Zip: ${currZip}  ·  ${eventDrivingDistance.toFixed(0)} miles from Westmont  ·  ${guests} guests`);

    $('#quote-section').show();
}

recalculateEventCosts();
