function sendEmail() {
    // Email.send({
    //     SecureToken: "82e2b2d3-f096-4127-a9f6-42bf1617f221",
    //     To: 'minidonauts@gmail.com',
    //     From: 'minidonauts@gmail.com',
    //     // From : $('#user-email-address').val(),
    //     Subject: "This is the subject",
    //     Body: "And this is the body"
    // }).then(
    //     message => {
    //         alert(message);
    //         //   location.href="reservationMade.html";
    //     }
    // );
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
        $result.css('color', 'red');
    }
    return false;
});