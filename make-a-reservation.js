function sendEmail() {
    Email.send({
        SecureToken: "82e2b2d3-f096-4127-a9f6-42bf1617f221",
        To: 'minidonauts@gmail.com',
        From: 'minidonauts@gmail.com',
        // From : $('#user-email-address').val(),
        Subject: "This is the subject",
        Body: "And this is the body"
    }).then(
        message => {
            alert(message);
            //   location.href="reservationMade.html";
        }
    );
}