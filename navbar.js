fetch(window.location.origin + "/navbar.html")
    .then(response => {
        return response.text()
    })
    .then(data => {
        document.querySelector("partial-navbar").innerHTML = data;

        var tabCurrentMarkets = document.querySelector('#tab-currentMarkets');
        var tabMakeAReservation = document.querySelector('#tab-makeAReservation');
        var tabAboutUs = document.querySelector('#tab-aboutUs');

        if (window.location.pathname == "/current-markets.html") {
            tabCurrentMarkets.classList.add('tab-selected');
            tabCurrentMarkets.classList.remove('tab-unselected');
        } else {
            tabCurrentMarkets.classList.remove('tab-selected');
            tabCurrentMarkets.classList.add('tab-unselected');
        }
        if (window.location.pathname == "/make-a-reservation.html") {
            tabMakeAReservation.classList.add('tab-selected');
            tabMakeAReservation.classList.remove('tab-unselected');
        } else {
            tabMakeAReservation.classList.remove('tab-selected');
            tabMakeAReservation.classList.add('tab-unselected');
        }
        if (window.location.pathname == "/about-us.html") {
            tabAboutUs.classList.add('tab-selected');
            tabAboutUs.classList.remove('tab-unselected');
        } else {
            tabAboutUs.classList.remove('tab-selected');
            tabAboutUs.classList.add('tab-unselected');
        }
    });