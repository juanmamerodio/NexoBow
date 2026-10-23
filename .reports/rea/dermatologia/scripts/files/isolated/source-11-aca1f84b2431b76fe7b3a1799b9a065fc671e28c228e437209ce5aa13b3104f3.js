
	 (function(window, document) {

		document.documentElement.classList.remove("no-js");

		if(navigator.userAgent.match(/(Android|iPod|iPhone|iPad|BlackBerry|IEMobile|Opera Mini)/)) {
			document.body.className += " using-mobile-browser mobile ";
		}
		if(navigator.userAgent.match(/Mac/) && navigator.maxTouchPoints && navigator.maxTouchPoints > 2) {
			document.body.className += " using-ios-device ";
		}

		if( !("ontouchstart" in window) ) {

			var body = document.querySelector("body");
			var winW = window.innerWidth;
			var bodyW = body.clientWidth;

			if (winW > bodyW + 4) {
				body.setAttribute("style", "--scroll-bar-w: " + (winW - bodyW - 4) + "px");
			} else {
				body.setAttribute("style", "--scroll-bar-w: 0px");
			}
		}

	 })(window, document);
   