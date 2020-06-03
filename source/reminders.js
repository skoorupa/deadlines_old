var reminders = {};

ipc.on("reminders", function(event, content) {
	reminders = content;
});
