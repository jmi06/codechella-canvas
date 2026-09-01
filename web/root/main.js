function main() {
	let cvs = document.querySelector("#viewport-canvas");
	let glWindow = new GLWindow(cvs);

	if (!glWindow.ok()) return;

	let place = new Place(glWindow);
	place.initConnection();

	let gui = GUI(cvs, glWindow, place);
}

const GUI = (cvs, glWindow, place) => {
	let color = new Uint8Array([0, 0, 0]);
	let dragdown = false;
	let touchID = 0;
	let touchScaling = false;
	let lastMovePos = { x: 0, y: 0 };
	let lastScalingDist = 0;
	let touchstartTime;
	const MIN_COOLDOWN = 2000; 
	const MAX_COOLDOWN = 30000; 
	const ADMIN_PASSWORD = "QzBkM0NoMzExQA=="
	
	const colorField = document.querySelector("#color-field");
	const colorSwatch = document.querySelector("#color-swatch");
	let ADMIN;

	if (!localStorage.getItem("place_again")) {
		localStorage.setItem("place_again", 0);
	}

	if (localStorage.getItem("user").Uint8Array.prototype.toBase64() == ADMIN_PASSWORD){
		ADMIN = true;
	}


	// ***************************************************
	// ***************************************************
	// Event Listeners
	//
	document.addEventListener("keydown", ev => {
		switch (ev.keyCode) {
			case 189:
			case 173:
				ev.preventDefault();
				zoomOut(1.2);
				break;
			case 187:
			case 61:
				ev.preventDefault();
				zoomIn(1.2);
				break;
		}
	});

	window.addEventListener("wheel", ev => {
		let zoom = glWindow.getZoom();
		if (ev.deltaY > 0) {
			zoom /= 1.05;
		} else {
			zoom *= 1.05;
		}
		glWindow.setZoom(zoom);
		glWindow.draw();
	});

	document.querySelector("#zoom-in").addEventListener("click", () => {
		zoomIn(1.2);
	});

	document.querySelector("#zoom-out").addEventListener("click", () => {
		zoomOut(1.2);
	});

	window.addEventListener("resize", ev => {
		glWindow.updateViewScale();
		glWindow.draw();
	});

	cvs.addEventListener("mousedown", (ev) => {
		switch (ev.button) {
			case 0:
				dragdown = true;
				lastMovePos = { x: ev.clientX, y: ev.clientY };
				break;
			case 1:
				pickColor({ x: ev.clientX, y: ev.clientY });
				break;
			case 2:
				if (ev.ctrlKey) {
					pickColor({ x: ev.clientX, y: ev.clientY });
				} else {
					drawPixel({ x: ev.clientX, y: ev.clientY }, color);
				}
		}
	});

	document.addEventListener("mouseup", (ev) => {
		dragdown = false;
		document.body.style.cursor = "auto";
	});

	document.addEventListener("mousemove", (ev) => {
		const movePos = { x: ev.clientX, y: ev.clientY };
		if (dragdown) {
			glWindow.move(movePos.x - lastMovePos.x, movePos.y - lastMovePos.y);
			glWindow.draw();
			document.body.style.cursor = "grab";
		}
		lastMovePos = movePos;
	});

	cvs.addEventListener("touchstart", (ev) => {
		let thisTouch = touchID;
		touchstartTime = (new Date()).getTime();
		lastMovePos = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
		if (ev.touches.length === 2) {
			touchScaling = true;
			lastScalingDist = null;
		}

		setTimeout(() => {
			if (thisTouch == touchID) {
				pickColor(lastMovePos);
				navigator.vibrate(200);
			}
		}, 350);
	});
	document.addEventListener("touchend", (ev) => {
		touchID++;
		let elapsed = (new Date()).getTime() - touchstartTime;
		if (elapsed < 100) {
			if (drawPixel(lastMovePos, color)) {
				navigator.vibrate(10);
			};
		}
		if (ev.touches.length === 0) {
			touchScaling = false;
		}
	});

	document.addEventListener("touchmove", (ev) => {
		touchID++;
		if (touchScaling) {
			let dist = Math.hypot(
				ev.touches[0].pageX - ev.touches[1].pageX,
				ev.touches[0].pageY - ev.touches[1].pageY);
			if (lastScalingDist != null) {
				let delta = lastScalingDist - dist;
				if (delta < 0) {
					zoomIn(1 + Math.abs(delta) * 0.003);
				} else {
					zoomOut(1 + Math.abs(delta) * 0.003);
				}
			}
			lastScalingDist = dist;
		} else {
			let movePos = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
			glWindow.move(movePos.x - lastMovePos.x, movePos.y - lastMovePos.y);
			glWindow.draw();
			lastMovePos = movePos;
		}
	});

	cvs.addEventListener("contextmenu", () => { return false; });

	let hex = colorField.value.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
	hex = hex.substring(0, 6);
	while (hex.length < 6) {
		hex += "0";
	}
	color[0] = parseInt(hex.substring(0, 2), 16);
	color[1] = parseInt(hex.substring(2, 4), 16);
	color[2] = parseInt(hex.substring(4, 6), 16);
	hex = "#" + hex;
	colorField.value = hex;


	colorField.addEventListener("change", ev => {
		let hex = colorField.value.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
		hex = hex.substring(0, 6);
		while (hex.length < 6) {
			hex += "0";
		}
		color[0] = parseInt(hex.substring(0, 2), 16);
		color[1] = parseInt(hex.substring(2, 4), 16);
		color[2] = parseInt(hex.substring(4, 6), 16);
		hex = "#" + hex;
		colorField.value = hex;
		// colorSwatch.style.backgroundColor = hex;
	});

	// ***************************************************
	// ***************************************************
	// Helper Functions
	//
	const pickColor = (pos) => {
		color = glWindow.getColor(glWindow.click(pos));
		let hex = "#";
		for (let i = 0; i < color.length; i++) {
			let d = color[i].toString(16);
			if (d.length == 1) d = "0" + d;
			hex += d;
		}
		colorField.value = hex.toUpperCase();
		// colorSwatch.style.backgroundColor = hex;
	}

	const calcRandomCooldown = () => {
		return Math.ceil(Math.random() * (MAX_COOLDOWN - MIN_COOLDOWN) + MIN_COOLDOWN);
	}

	const getRemainingCooldown = () => {
		return parseInt(localStorage.getItem("place_again") - Date.now())
	};

	const drawPixel = (pos, color) => {
		let remainingCooldown;
			
		if (ADMIN == true){
			let remainingCooldown = 0
		} else{
			let remainingCooldown = getRemainingCooldown()
		}
		if (remainingCooldown > 0) {
			// Don't let the user draw
			return false;
		}

		pos = glWindow.click(pos);
		if (pos) {
			const oldColor = glWindow.getColor(pos);
			for (let i = 0; i < oldColor.length; i++) {
				if (oldColor[i] != color[i]) {
					place.setPixel(pos.x, pos.y, color);

					const cooldown = calcRandomCooldown()
					const resumeTime = Date.now() + cooldown;
					localStorage.setItem("place_again", resumeTime.toString());

					return true;
				}
			}
		}
		return false;
	}

	const zoomIn = (factor) => {
		let zoom = glWindow.getZoom();
		glWindow.setZoom(zoom * factor);
		glWindow.draw();
	}

	const zoomOut = (factor) => {
		let zoom = glWindow.getZoom();
		glWindow.setZoom(zoom / factor);
		glWindow.draw();
	}

	const updateTimer = () => {
		const timeContainer = document.getElementById('timer');
		const timer = document.getElementById("time-remaining");
		timer.innerText = getRemainingCooldown() > 0 ? Math.ceil(getRemainingCooldown() / 1000) : 0;

		if (getRemainingCooldown() > 0) {
			timeContainer.classList.add('red')
			timeContainer.classList.remove('green')
		} else {
			timeContainer.classList.add('green')
			timeContainer.classList.remove('red')
		}
	}


	async function getConnectedUsers() {
		try {
			const res = await fetch('/stat');
			const count = await res.text();
			document.getElementById("online-count").innerText = count
			return parseInt(count);
		} catch (err) {
			console.error(err);
		}
	}

	const timeTilEnd = () => {
		let timeStr;
		const end = Math.floor(Date.UTC(2026, 8, 11, 23, 59, 59) / 1000);
		const deltaTime = end - Math.floor(Date.now() / 1000);

		if (deltaTime >= 86400) { //More than a day remaining
			timeStr = `${Math.floor(deltaTime / 86400)} Days`
		} else if (deltaTime >= 3600) { //Less than a day, but more than an hour
			timeStr = `${Math.floor(deltaTime / 3600)} Hours`
		} else if (deltaTime >= 60) { //Less than an hour, but more than a minute
			timeStr = `${Math.floor(deltaTime / 60)} Minutes`
		} else if (deltaTime < 60 > 0) {
			timeStr = `${deltaTime} Seconds`
		} else {
			timeStr = '0'
		}

		document.getElementById('time-til-close').innerText = timeStr

	}


	updateTimer()
	getConnectedUsers()
	timeTilEnd()

	setInterval(() => {
		updateTimer()
	}, 500);

	setInterval(() => {
		getConnectedUsers()
	}, 20000);

	setInterval(() => {
		timeTilEnd()
	}, 1000);

}
