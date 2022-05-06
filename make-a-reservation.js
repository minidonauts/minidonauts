function sendEmail() {
    const emailAddress = $('#user-email-address').val();
    const eventAddress = $('#event-address').val();
    const eventDate = $('#event-date').val();
    const eventTime = $('#event-start option:selected')[0].text;
    const eventHours = $('#event-hours').val();

    var isValid= true;
    if(emailAddress==""){
        $('#user-email-address-invalid').text("Email Address is required");
        isValid = false;
    }
    if(eventHours=="" || eventHours=="-" || eventHours==0){
        $('#event-hours-invalid').text("Hour(s) are required");
        isValid = false;
    } else {
        $('#event-hours-invalid').text("");
    }
    if(eventAddress==""){
        $('#event-address-invalid').text("Address of Event is required");
        isValid = false;
    } else {
        $('#event-address-invalid').text("");
    }
    if(eventDate==""){
        $('#event-date-invalid').text("Date of Event is required");
        isValid = false;
    } else {
        $('#event-date-invalid').text("");
    }

    if (isValid) {
        var htmlString = document.getElementById('reservation-email-template').innerHTML;
        htmlString = htmlString.replace("{{EventAddress}}",eventAddress);
        htmlString = htmlString.replace("{{EventDateAndTime}}",eventTime+" on "+eventDate);
        htmlString = htmlString.replace("{{EventHours}}",eventHours + " hr(s)");

        Email.send({
            SecureToken: "56ffec6d-82d6-44a4-ad77-9d33260d33cc",
            To: emailAddress,
            Cc: 'minidonauts@gmail.com',
            From: 'minidonauts@gmail.com',
            Subject: "Mini Donauts Reservation",
            Body: htmlString
        }).then(
            message => {
                location.href="reservation-made.html";
            }
        );        
    }
}


const bookedDates = ["05-07-2022"];
function disableDates(date) {
    var string = $.datepicker.formatDate('mm-dd-yy', date);
    var isBookedDate = bookedDates.indexOf(string) != -1;

    var filterDate = new Date(string);
    var day = filterDate.getDay();
    var isWeekDay = day != 0 && day !=6;

    return [!isBookedDate && !isWeekDay];
}
$("#event-date").datepicker({
    beforeShowDay: disableDates
});

const validateEmail = (email) => {
    return email.match(
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

$("#user-email-address").keyup(function () {
    const $result = $('#user-email-address-invalid');
    const email = $('#user-email-address').val();
    $result.text('');

    if (validateEmail(email)) {
        $result.text('');
    } else {
        $result.text('email address is invalid');
    }
    return false;
});