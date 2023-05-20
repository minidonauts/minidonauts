fetch(window.location.origin + "/navbar.html")
    .then(response => {
        return response.text()
    })
    .then(data => {
        document.querySelector("partial-navbar").innerHTML = data;
    });