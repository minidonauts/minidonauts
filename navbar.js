fetch(window.location.origin + "/navbar.html")
    .then(response => {
        return response.text()
    })
    .then(data => {
        document.querySelector("partial-navbar").innerHTML = data;

        var tabWhereToFindUs = document.querySelector('#tab-whereToFindUs');
        var tabMakeAReservation = document.querySelector('#tab-makeAReservation');
        var tabAboutUs = document.querySelector('#tab-aboutUs');

        if (window.location.pathname == "/where-to-find-us.html" || window.location.pathname == "/current-markets.html") {
            tabWhereToFindUs.classList.add('tab-selected');
            tabWhereToFindUs.classList.remove('tab-unselected');
        } else {
            tabWhereToFindUs.classList.remove('tab-selected');
            tabWhereToFindUs.classList.add('tab-unselected');
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
