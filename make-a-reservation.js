function sendEmail() {
    var email = 'minidonauts@gmail.com';
    var subject = 'Blast Off with Mini Donauts: Reservation Inquiry';
    var emailBody = "Hi,\n" +
        `To provide a better idea of my event, here is some extra details:\n` +
        `\tEvent City/Zipcode (e.g. 60174): \n` +
        `\tEvent Date (e.g. June 16th): \n` +
        `\tTime donuts should start to be served (e.g. 10AM): \n` +
        `\tDuration of donut production (e.g. 1 hour): \n` +
        `\tEstimated number of guests (e.g. 40): \n` +
        `\tI want custom labels (e.g. N or Y, "Good luck at ABC, Norbert!"): \n` +
        `\n`;
    document.location = "mailto:" + email + "?subject=" + subject + "&body=" + encodeURIComponent(emailBody);
}