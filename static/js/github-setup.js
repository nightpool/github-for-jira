const newJiraSiteBtn = document.getElementById("new-jira-site-modal-btn");
const newJiraSiteModal = document.getElementById("new-jira-site-modal");
const cancelNewJiraSiteBtn = document.getElementById("modal-close");

if (newJiraSiteBtn) {
	newJiraSiteBtn.onclick = function() {
		newJiraSiteModal.style.display = "block";
	};
}

if (cancelNewJiraSiteBtn) {
	cancelNewJiraSiteBtn.onclick = function() {
		newJiraSiteModal.style.display = "none";
	};
}

const hasProtocol = (str) =>
	str.includes("http://") || str.includes("https://") || str.includes("www.");

$(document).ready(() => {
	// Handle form submit
	$(".githubSetup__form").on("submit", (event) => {
		event.preventDefault();
		// TODO do something here to show user that form is being submitted
		$.post(
			event.target.action,
			Object.fromEntries(new FormData(event.target).entries())
		)
			.done(function(body) {
				if (body.error) {
					throw body;
				}

				// Redirecting the user to the correct jira instance
				// Should probably redo this with query strings and just redoing the GET request
				document.location.href = body.redirect;
			})
			.fail(function(response) {
				// Handle failure
			});
		;
	});

	// Handle events for main form
	$(".inputMain").on("input", () => {
		const jiraDomainMain = $("#jiraDomainMain").val();

		if (jiraDomainMain) {
			if (jiraDomainMain.length > 0 || !hasProtocol(jiraDomainMain)) {
				$("#jiraDomainMainSubmitBtn").prop("disabled", false);
				$("#jiraDomainMainSubmitBtn").attr("aria-disabled", "false");
				$(".githubSetup__form__input").removeClass(
					"githubSetup__form__inputError"
				);
				$(".githubSetup__form__errorMessage__container").addClass("hidden");
			}

			if (jiraDomainMain.length > 0 && hasProtocol(jiraDomainMain)) {
				$(".inputMain").addClass(
					"githubSetup__form__inputError"
				);
				$(".githubSetup__form__errorMessage__container").removeClass("hidden");
			}
		} else {
			$("#jiraDomainMainSubmitBtn").prop("disabled", true);
			$("#jiraDomainMainSubmitBtn").attr("aria-disabled", "true");
			$(".inputMain").removeClass(
				"githubSetup__form__inputError"
			);
			$(".githubSetup__form__errorMessage__container").addClass("hidden");
		}
	});

	// Handle events for modal form
	$(".inputModal").on("input", () => {
		const jiraDomainModal = $("#jiraDomainModal").val();
		if (jiraDomainModal) {
			if (jiraDomainModal.length > 0 || !hasProtocol(jiraDomainModal)) {
				$("#jiraDomainModalSubmitBtn").prop("disabled", false);
				$("#jiraDomainModalSubmitBtn").attr("aria-disabled", "false");
				$(".githubSetup__form__input").removeClass(
					"githubSetup__form__inputError"
				);
				$(".githubSetup__form__errorMessage__container").addClass("hidden");
			}

			if (jiraDomainModal.length > 0 && hasProtocol(jiraDomainModal)) {
				$(".inputModal").addClass(
					"githubSetup__form__inputError"
				);
				$(".githubSetup__form__errorMessage__container").removeClass("hidden");
			}
		} else {
			$("#jiraDomainModalSubmitBtn").prop("disabled", true);
			$("#jiraDomainModalSubmitBtn").attr("aria-disabled", "true");
			$(".inputModal").removeClass(
				"githubSetup__form__inputError"
			);
			$(".githubSetup__form__errorMessage__container").addClass("hidden");
		}
	});
});
