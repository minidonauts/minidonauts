function downloadQuote() {
    const card = document.getElementById('quote-card');
    html2canvas(card, { scale: 2, useCORS: true, backgroundColor: null }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'mini-donauts-quote.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function downloadBusinessCardFront() {
    const card = document.getElementById('business-card-front');
    html2canvas(card, { scale: 3, useCORS: true, backgroundColor: null }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'mini-donauts-business-card-front.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function downloadBusinessCardBack() {
    const card = document.getElementById('business-card-back');
    html2canvas(card, { scale: 3, useCORS: true, backgroundColor: null }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'mini-donauts-business-card-back.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function downloadBusinessCard() {
    downloadBusinessCardFront();
}

function downloadMarketMenu() {
    const card = document.getElementById('market-menu-card');
    const targetWidthPx = 3600;
    const scaleForPrint = targetWidthPx / card.offsetWidth;
    html2canvas(card, {
        scale: scaleForPrint,
        useCORS: true,
        backgroundColor: null
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'mini-donauts-market-menu-2x3-print.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

let eventZipCode;
let eventDrivingTime;
let eventDrivingDistance;

// Cost constants
const CAR_CENTS_PER_MILE  = 0.22;
const GEN_GAL_PER_HR      = 4 / 6;
const GAS_PRICE           = 4;
const MIX_BAG_COST        = 90;
const BATCHES_PER_BAG     = 19;
const SERVINGS_PER_BATCH  = 14;  // bags of donuts per batch of mix

// Machine configurations: label, bags per hour, complexity premium (% of single-flow base), propane
const MACHINES = [
    { label: 'Single Flow',    bagsPerHr: 75,  premium: 0,    propane: 5  },
    { label: 'Double Flow',    bagsPerHr: 150, premium: 0.12, propane: 5  },
    { label: '2\xD7 Double Flow', bagsPerHr: 300, premium: 0.22, propane: 10 },
];
const PREP_HRS            = 2;
const CLEAN_HRS           = 2;
const LOAD_HRS            = 1;
const WAGE_PER_HR         = 50 * 2;  // 2 chefs
const OWNER_CUT           = 0.32;
const CAPEX_RATE          = 0.15;
const GUEST_SCALE_RATE    = 0.002;  // quadratic — tune to control how fast $/person grows with crowd size
const GUEST_SCALE_FLOOR   = 100;    // guests below this add nothing

function travelCost(serviceHours) {
    const carGas = CAR_CENTS_PER_MILE * eventDrivingDistance * 2;
    const genGas = (PREP_HRS + serviceHours + CLEAN_HRS + LOAD_HRS) * GEN_GAL_PER_HR * GAS_PRICE;
    return carGas + genGas;
}

// Prep + service + drive are per-employee (both chefs); clean + load are fixed totals (single rate)
function laborCost(serviceHours) {
    const perEmployeeHrs = serviceHours + PREP_HRS + eventDrivingTime * 2;
    const totalHrs       = CLEAN_HRS + LOAD_HRS;
    return perEmployeeHrs * WAGE_PER_HR + totalHrs * (WAGE_PER_HR / 2);
}


function ingredientCost(batches, cookingHours) {
    const mix   = (MIX_BAG_COST / BATCHES_PER_BAG) * batches;
    const oil   = cookingHours * 2 + batches;
    const water = batches / 2;
    return mix + oil + water;
}

function applyMarkup(cost) {
    return cost * (1 + OWNER_CUT + CAPEX_RATE);
}

function guestScaleFee(guests) {
    const over = Math.max(0, guests - GUEST_SCALE_FLOOR);
    return GUEST_SCALE_RATE * over * over;
}

// AYCE: full production capacity, host pays everything
function calculateAYCE(hours, machine, guests) {
    const batches = Math.ceil(machine.bagsPerHr * hours / SERVINGS_PER_BATCH);
    const base = travelCost(hours) + ingredientCost(batches, hours) + laborCost(hours) + machine.propane + machine.surcharge + guestScaleFee(guests);
    return applyMarkup(base);
}

// Ticketed: exactly 1 bag per guest, ingredients based on headcount
function calculateTicketed(hours, guests, machine) {
    const batches = Math.ceil(guests / SERVINGS_PER_BATCH);
    const base = travelCost(hours) + ingredientCost(batches, hours) + laborCost(hours) + machine.propane + machine.surcharge + guestScaleFee(guests);
    return applyMarkup(base);
}

// Landing: flat show-up fee — labor/travel covered by direct sales revenue
// Tune LANDING_BASE and LANDING_PER_GUEST to hit target prices
const LANDING_BASE      = 130;   // base fee regardless of guest count
const LANDING_PER_GUEST = 0.28;  // per-guest rate (130 + 0.28*250 ≈ $200, + 0.28*800 ≈ $354)

function calculateLanding(guests, machine) {
    return (LANDING_BASE + guests * LANDING_PER_GUEST) * (1 + machine.premium);
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

    // Single-flow base cost — used to scale percentage premiums across all modes
    const baseHrs   = Math.max(1, Math.ceil(guests / MACHINES[0].bagsPerHr));
    const sfBatches = Math.ceil(MACHINES[0].bagsPerHr * baseHrs / SERVINGS_PER_BATCH);
    const sfBase    = travelCost(baseHrs) + ingredientCost(sfBatches, baseHrs) + laborCost(baseHrs) + MACHINES[0].propane;

    // In machine view, respect the show-single-flow toggle after grid is populated
    const showSF = !$('#duration-view').is(':checked') && !$('#show-single-flow').is(':checked');

    if ($('#duration-view').is(':checked')) {
        // Duration View: selected machine at minimum hours + 2 longer options
        const machine   = $('#duration-single').is(':checked') ? MACHINES[0] : MACHINES[1];
        const minHrs    = Math.max(1, Math.ceil(guests / machine.bagsPerHr));
        const hours     = [minHrs, minHrs + 1, minHrs + 2];
        $('#q-guest-range').text(machine.label);
        $('#qm-th-0, #qm-ayce-0, #qm-tick-0, #qm-land-0').show();

        // Surcharge fixed at minimum-hours value so labor cost differences flow through cleanly
        const durationLaborOffset = (baseHrs - minHrs) * WAGE_PER_HR;
        const m = Object.assign({}, machine, { surcharge: durationLaborOffset + sfBase * machine.premium });

        hours.forEach((h, i) => {
            const hUnit = h === 1 ? 'Hr' : 'Hrs';
            $(`#qm-th-${i}`).html(
                `<span style="display:block;">${h}</span>` +
                `<span style="display:block;">${hUnit}</span>`
            );
            $(`#qm-ayce-${i}`).text(fmt(calculateAYCE(h, m, guests)));
            $(`#qm-tick-${i}`).text(fmt(calculateTicketed(h, guests, m)));
            $(`#qm-land-${i}`).text(fmt(calculateLanding(guests, machine)));
        });

    } else {
        // Machine View: one column per machine type, each at its own minimum hours
        const rangeMin = (baseHrs - 1) * MACHINES[0].bagsPerHr + 1;
        const rangeMax = baseHrs * MACHINES[0].bagsPerHr;
        $('#q-guest-range').text(`${rangeMin} – ${rangeMax} guests`);

        MACHINES.forEach((machine, i) => {
            const minHrs      = Math.max(1, Math.ceil(guests / machine.bagsPerHr));
            const hrsLabel    = minHrs === 1 ? '1 Hr' : `${minHrs} Hrs`;
            const laborOffset = (baseHrs - minHrs) * WAGE_PER_HR;
            const m = Object.assign({}, machine, { surcharge: laborOffset + sfBase * machine.premium });
            $(`#qm-th-${i}`).html(
                `<span style="display:block;">${machine.label}</span>` +
                `<span style="display:block; font-size:0.75rem; font-weight:normal;">${hrsLabel}</span>`
            );
            $(`#qm-ayce-${i}`).text(fmt(calculateAYCE(minHrs, m, guests)));
            $(`#qm-tick-${i}`).text(fmt(calculateTicketed(minHrs, guests, m)));
            $(`#qm-land-${i}`).text(fmt(calculateLanding(guests, machine)));
        });
    }

    if (showSF) $('#qm-th-0, #qm-ayce-0, #qm-tick-0, #qm-land-0').hide();

    $('#q-event-info').text(`Zip: ${currZip}  •  ${eventDrivingDistance.toFixed(0)} miles from Westmont  •  ${guests} guests`);

    $('#quote-section').show();
    $('#business-card-section').show();
    $('#market-menu-section').show();
}

recalculateEventCosts();

$('#duration-view').on('change', function () {
    $('#duration-single-label').css('display', this.checked ? 'flex' : 'none');
    $('#show-single-flow-label').css('display', this.checked ? 'none' : 'flex');
    if (!this.checked) $('#duration-single').prop('checked', false);
    recalculateEventCosts();
});

$('#show-single-flow').on('change', function () {
    $('#qm-th-0, #qm-ayce-0, #qm-tick-0, #qm-land-0').toggle(this.checked);
});

$('#duration-single').on('change', recalculateEventCosts);

