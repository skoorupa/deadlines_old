var deadlinesbar = document.getElementById("deadlinesbar");
var deadlinescounter = document.getElementById("deadlinescounter");
var deadlinesdescription = document.getElementById("deadlinesdescription");
var deadlineslist = document.getElementById("deadlineslist");
var missedtasksbar = document.getElementById("missedtasksbar");
var missedtaskslist = document.getElementById("missedtaskslist");
var othertaskslist = document.getElementById("othertasks");
var remindersbar = document.getElementById("remindersbar");

deadlinesbar.getElementsByClassName("description")[0].style.display = "block";
deadlinesbar.getElementsByClassName("dropdown")[0].innerHTML = "∧";
deadlinesbar.parentNode.getElementsByClassName("list")[0].style.display = "none";
// missedtasksbar.getElementsByClassName("description")[0].style.display = "block";
missedtasksbar.getElementsByClassName("dropdown")[0].innerHTML = "∧";
missedtasksbar.parentNode.getElementsByClassName("list")[0].style.display = "none";

document.getElementById("version").innerHTML =  remote.app.getVersion();

todayBar();
setInterval(todayBar, 1000);

function toggleOverviewList(bar, choice) {
  if ((bar.getElementsByClassName("dropdown")[0].innerHTML == "∧" || choice=="show") && choice!="close"){
    if (bar.getElementsByClassName("description").length)
      bar.getElementsByClassName("description")[0].style.display = "none";
    bar.getElementsByClassName("dropdown")[0].innerHTML = "∨";
    bar.parentNode.getElementsByClassName("list")[0].style.display = "block";
  } else {
    if (bar.getElementsByClassName("description").length)
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
    console.log(schedule);
    update(
      schedule.upcomingDeadlines.tasks, 
      schedule.upcomingDeadlines.dc,
      schedule.upcomingDeadlines.days, 
      schedule.missedTasks,
      // schedule.orderedList, 
      schedule.showTasks, 
      schedule.otherTasks,
      schedule.remindTasks
    );
  }
})

function update(_deadlines, dc, days, missedTasks, _tasks, otherTasks, remindTasks) {
  var deadlines = JSON.parse(JSON.stringify(_deadlines));
  var tasks = JSON.parse(JSON.stringify(_tasks));

  missedtaskslist.innerHTML = "";
  deadlineslist.innerHTML = "";
  othertaskslist.innerHTML = "";

  if (missedTasks.length) {
    missedtasksbar.style.display = 'flex';
  } else {
    missedtasksbar.style.display = 'none';
    toggleOverviewList(missedtasksbar,"close");
  }

  function createListOfTasks(tasks) {
    var list = document.createElement("ul");
    for (var z = 0; z < tasks.length; z++) {
      (function(z) {
        var id = z;
        var task = tasks[id];
        var listitem = document.createElement("li");
        var checkbox = document.createElement("input");
        checkbox.setAttribute("type","checkbox");
        checkbox.addEventListener('click', function(e) {
          if (missed) {
            var newdeadline = schedule.content.tasks.find((obj) => {
              return obj.id == task.id
            });
            var d = new Date();
            newdeadline.lastcheck = task.timeid;
          } else {
            var newdeadline = JSON.parse(JSON.stringify(task));
            var d = new Date();
            // newdeadline.checked = this.checked;
            newdeadline.checked = (this.checked ? d.getTime() : false);
            newdeadline.lastcheck = (this.checked ? d.getTime() : newdeadline.lastcheck);
          }
          // updateTask(schedule.orderedList, task, newdeadline);
          updateTask(schedule.content.tasks, task, newdeadline);
        });
        if (task.checked)
          checkbox.setAttribute("checked","checked");
        listitem.appendChild(checkbox);
        var label = document.createElement("label");
        label.innerHTML = task.title;
        label.classList.add("clickable");
        label.classList.add("underline");
        label.classList.add("wordwrap");
        label.addEventListener('click', function(e) {
          showForm('show', task);
        });
        label.addEventListener("contextmenu", function(event) {
          event.preventDefault();
          // if (contextmenu) contextmenu.hide();
          contextmenu = new ContextMenu([
            {
              text:"Edytuj",
              icon:"📝",
              events: {
                click: function (e){
                  showForm("edit",task);
                }
              }
            },
            {
              text:"Usuń",
              icon:"❌",
              events: {
                click: function (e){
                  deleteTask(task);
                }
              }
            }
          ], {"close_on_click":true});
          contextmenu.display(event);
        });

        listitem.appendChild(label);
        list.appendChild(listitem);
      })(z);
    }
    return list;
  }

  missedtaskslist.appendChild(createListOfTasks(missedTasks));

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
      document.getElementById("dayscounter").innerHTML = `w przeciągu ${days} dni`;
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

  
  deadlineslist.appendChild(createListOfTasks(deadlines));

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
        newdeadline.lastcheck = (this.checked ? d.getTime() : newdeadline.lastcheck);
        // updateTask(schedule.orderedList, task, newdeadline);
        updateTask(schedule.content.tasks, task, newdeadline);
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

      var date;
      if (task.date) {
        date = document.createElement("div");
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
      }

      bar.appendChild(checkboxdiv);
      bar.appendChild(context);
      if (task.date) bar.appendChild(date);

      bar.addEventListener("contextmenu", function(event) {
        event.preventDefault();
        // if (contextmenu) contextmenu.hide();
        contextmenu = new ContextMenu([
          {
            text:"Edytuj",
            icon:"📝",
            events: {
              click: function (e){
                showForm("edit",task);
              }
            }
          },
          {
            text:"Usuń",
            icon:"❌",
            events: {
              click: function (e){
                deleteTask(task);
              }
            }
          }
        ], {"close_on_click":true});
        contextmenu.display(event);
      });

      othertaskslist.appendChild(bar);
    })(i);
  }

  if (remindTasks.length) {
    var clone = remindersbar.cloneNode(true);
    remindersbar.remove();
    document.getElementById("overview").insertBefore(clone, othertaskslist);
    remindersbar = clone;
    var remindercounter = document.getElementById("remindercounter");
    var remindertitle = document.getElementById("remindertitle");

    remindersbar.style.display = 'flex';
    var reminder = remindTasks[0];
    var now = new Date();
    var d = new Date(reminder.remind.timeid);
    var dc = Math.floor((d.getTime()-now.getTime())/(24*60*60*1000));

    remindertitle.textContent = reminder.title;
    if (dc==0) remindercounter.textContent = `Przypomnienie o ${reminder.remind.remindtime}`;
    else if (dc==1) remindercounter.textContent = `Przypomnienie jutro o ${reminder.remind.remindtime}`;
    else if (dc==2) remindercounter.textContent = `Przypomnienie pojutrze o ${reminder.remind.remindtime}`;
    else if (dc<=7) remindercounter.textContent = `Przypomnienie w tym tygodniu o ${reminder.remind.remindtime}`;
    else if (dc<=14) remindercounter.textContent = `Przypomnienie w ciągu 2 tygodni o ${reminder.remind.remindtime}`;
    else remindercounter.textContent = `Przypomnienie ${reminder.remind.reminddate} o ${reminder.remind.remindtime}`;

    remindersbar.addEventListener("click", function(e) {
      showForm("show", reminder);
    });

    remindersbar.addEventListener("contextmenu", function(event) {
        event.preventDefault();
        // if (contextmenu) contextmenu.hide();
        contextmenu = new ContextMenu([
          {
            text:"Edytuj",
            icon:"📝",
            events: {
              click: function (e){
                showForm("edit",reminder);
              }
            }
          },
          {
            text:"Usuń",
            icon:"❌",
            events: {
              click: function (e){
                deleteTask(reminder);
              }
            }
          }
        ], {"close_on_click":true});
        contextmenu.display(event);
      });
  } else remindersbar.style.display = 'none';
}

Mousetrap.bind(["command+tab","ctrl+tab"], function(e) {
  showMode('calendar');
});
