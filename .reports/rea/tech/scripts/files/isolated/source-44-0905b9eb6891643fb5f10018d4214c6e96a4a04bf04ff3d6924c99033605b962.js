
	(() => {
		const notice = document.getElementById('think-notice');
		if (!notice) return;

		try {
			if (localStorage.getItem(notice.dataset.storageKey) === '1') return;
		} catch {
			// Show when storage is unavailable.
		}

		notice.hidden = false;
	})();
