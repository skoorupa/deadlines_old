var reminders = {};

ipc.on("reminders", function(event, content) {
	reminders = JSON.parse(content);
	console.log(reminders);
});

// only for developing

document.getElementsByClassName("reminderbar")[0].getElementsByClassName("description")[0].style.display = "block";
document.getElementsByClassName("reminderbar")[0].getElementsByClassName("dropdown")[0].innerHTML = "∧";
document.getElementsByClassName("reminderbar")[0].parentNode.getElementsByClassName("list")[0].style.display = "none";

// end

function toggleOverviewList(bar) {
  if (bar.getElementsByClassName("description")[0].style.display=="block"){
    bar.getElementsByClassName("description")[0].style.display = "none";
    bar.getElementsByClassName("dropdown")[0].innerHTML = "∨";
    bar.parentNode.getElementsByClassName("list")[0].style.display = "block";
  } else {
    bar.getElementsByClassName("description")[0].style.display = "block";
    bar.getElementsByClassName("dropdown")[0].innerHTML = "∧";
    bar.parentNode.getElementsByClassName("list")[0].style.display = "none";
  }
}
