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