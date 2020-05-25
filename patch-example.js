//patch
//for deadlines v0.7.0
const {dialog,app} = require("electron");
var patch = {
	id: "deadlines-v0.7.0-test",
	description: "Deadlines v0.7.0 - test",
	version: "0.7.0",
	execute: function(schedulelist) {
		console.log(this.id);
		console.log(this.description);

		app.on("ready", function() {
			dialog.showMessageBox({
				title: "TEST",
				message: "działa!"
			});
		});
	}
}

module.exports = patch;