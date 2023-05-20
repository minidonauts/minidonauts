fetch(window.location.origin + "/footer.html")
    .then(response => {
        return response.text()
    })
    .then(data => {
        document.querySelector("partial-footer").innerHTML = data;
    });