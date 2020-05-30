var deadlinesbar = document.getElementById("deadlinesbar");
var deadlinescounter = document.getElementById("deadlinescounter");
var deadlinesdescription = document.getElementById("deadlinesdescription");
var deadlineslist = document.getElementById("deadlineslist");
var othertaskslist = document.getElementById("othertasks");

deadlinesbar.getElementsByClassName("description")[0].style.display = "block";
deadlinesbar.getElementsByClassName("dropdown")[0].innerHTML = "∧";
deadlinesbar.parentNode.getElementsByClassName("list")[0].style.display = "none";

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

ipc.on("schedule", function (event, arg) {
  schedule = JSON.parse(arg);
  // upcomingdeadlines = JSON.parse(arg).upcomingDeadlines.tasks;
  // dc = JSON.parse(arg).upcomingDeadlines.dc;
  // days = JSON.parse(arg).upcomingDeadlines.days;
  // schedule.orderedList = JSON.parse(arg).orderedList;

  if (!debugging){
    renderDeadlines(
      schedule.upcomingDeadlines.tasks, 
      schedule.upcomingDeadlines.dc,
      schedule.upcomingDeadlines.days, 
      schedule.orderedList, 
      schedule.otherTasks
    );
    console.log(schedule);
  }
})

function renderDeadlines(_deadlines, dc, days, _tasks, otherTasks) {
  var deadlines = JSON.parse(JSON.stringify(_deadlines));
  var tasks = JSON.parse(JSON.stringify(_tasks));

  deadlineslist.innerHTML = "";
  othertaskslist.innerHTML = "";

  switch (dc) {
    case 0:
      deadlinescounter.innerHTML = "Brak zadań";
      break;
    case 1:
      deadlinescounter.innerHTML = "1 zadanie";
      break;
    case 2:
    case 3:
    case 4:
      deadlinescounter.innerHTML = dc + " zadania";
      break;
    default:
      deadlinescounter.innerHTML = dc + " zadań"
  }

  switch (days) {
    case 0:
      document.getElementById("dayscounter").innerHTML = "na dzisiaj";
      break;
    case 1:
      document.getElementById("dayscounter").innerHTML = "na jutro";
      break;
    case 2:
      document.getElementById("dayscounter").innerHTML = "na pojutrze";
      break;
    case 7:
      document.getElementById("dayscounter").innerHTML = "w przeciągu tygodnia";
      break;
    case 14:
      document.getElementById("dayscounter").innerHTML = "w przeciągu 2 tygodni";
      break;
    case 21:
      document.getElementById("dayscounter").innerHTML = "w przeciągu 3 tygodni";
      break;
    default:
      document.getElementById("dayscounter").innerHTML = "w przeciągu " + (days) + " dni"
  }

  var description = "";
  for (var i = 0; i < deadlines.length; i++) {
    if (deadlines[i].checked)
      description += "<span class='strike'>"+deadlines[i].title+"</span>"
    else
      description += deadlines[i].title;

    if (i != deadlines.length-1)
      description += ", ";
  }
  deadlinesdescription.innerHTML = description;

  var list = document.createElement("ul");
  for (var z = 0; z < deadlines.length; z++) {
    (function(z) {
      var id = z;
      var listitem = document.createElement("li");
      var checkbox = document.createElement("input");
      checkbox.setAttribute("type","checkbox");
      var a = deadlines[id];
      checkbox.addEventListener('click', function(e) {
        var newdeadline = JSON.parse(JSON.stringify(a));
        newdeadline.checked = this.checked;
        updateTask(schedule.orderedList, a, newdeadline);
      });
      if (deadlines[z].checked)
        checkbox.setAttribute("checked","checked");
      listitem.appendChild(checkbox);
      var label = document.createElement("label");
      label.innerHTML = deadlines[z].title;
      label.classList.add("clickable");
      label.classList.add("underline");
      label.classList.add("wordwrap");
      label.addEventListener('click', function(e) {
        showForm('show', a);
      });
      listitem.appendChild(label);
      list.appendChild(listitem);
    })(z);
  }
  deadlineslist.appendChild(list);

  if (settings["list-mode"].show_deadlines_with_other_tasks)
    otherTasks = tasks;
  for (var i = 0; i < otherTasks.length; i++) {
    var today = new Date();
    if (otherTasks[i].timeid < today.getTime()) continue;
    if (otherTasks[i].repeat) {
      if (decodeDate(otherTasks[i].date).getTime() < decodeDate(otherTasks[i].repeat.began).getTime()) continue;
      if (otherTasks[i].repeat.end)
        if (decodeDate(otherTasks[i].date).getTime() > decodeDate(otherTasks[i].repeat.end).getTime()) continue;
    }
    (function(z) {
      var task = otherTasks[z];
      var today = new Date();

      var bar = document.createElement("div");
      bar.classList.add("medium");
      bar.classList.add("bar");
      if (task.color)
        bar.classList.add("color-"+task.color);
      else
        bar.classList.add("color-default");
      bar.classList.add("othertaskbar");

      var checkboxdiv = document.createElement("div");
      checkboxdiv.classList.add("left");

      var checkbox = document.createElement("input");
      checkbox.setAttribute("type","checkbox");
      checkbox.addEventListener('click', function(e) {
        var newdeadline = JSON.parse(JSON.stringify(task));
        console.log(task.title);
        var d = new Date();
        newdeadline.checked = (this.checked ? d.getTime() : false);
        updateTask(schedule.orderedList, task, newdeadline);
      });
      if (task.checked)
        checkbox.setAttribute("checked","checked");
      checkboxdiv.appendChild(checkbox);

      var context = document.createElement("div");
      context.classList.add("context");
      context.classList.add("left");
      context.classList.add("wordwrap");
      context.classList.add("clickable");
      context.classList.add("underline");
      if (task.checked)
        context.classList.add("strike");
      context.addEventListener('click', function(e) {
        showForm('show', task);
      });
      context.innerHTML = task.title;

      var date = document.createElement("div");
      date.classList.add("right");
      var d = new Date(task.timeid);
      if (d.getDate() == today.getDate() && d.getMonth() == today.getMonth() && d.getFullYear() == today.getFullYear()){
        date.innerHTML +=
          (d.getHours() < 10 ? "0"+d.getHours() : d.getHours())
            +":"+
          (d.getMinutes() < 10 ? "0"+d.getMinutes() : d.getMinutes())
      } else {
        date.innerHTML = d.getDate()+"."+(
          (d.getMonth()+1) < 10 ? "0"+(d.getMonth()+1) : (d.getMonth()+1)
        );
        if (today.getFullYear() != d.getFullYear()) {
          date.innerHTML += "<br>."+d.getFullYear();
        }
      }

      bar.appendChild(checkboxdiv);
      bar.appendChild(context);
      bar.appendChild(date);
      othertaskslist.appendChild(bar);
    })(i);
  }
}

Mousetrap.bind(["command+tab","ctrl+tab"], function(e) {
  showMode('calendar');
});
