const ipc = require("electron").ipcRenderer;
const remote = require('electron').remote;
const {dialog} = require('electron').remote;

var schedule = {tasks:{}};
var debugging = false;
var editedtask = {};
var settings = ipc.sendSync("getsettings");

todayBar();
setInterval(todayBar, 1000);

document.getElementById("version").innerHTML =  remote.app.getVersion();

/* form stuff */

document.querySelectorAll("label > input[type=checkbox]").forEach(function(obj) {
  function toggle(checkbox) {
    console.log(checkbox);
    var divs = checkbox.parentNode.querySelectorAll("div");
    var directchildren = checkbox.parentNode.children;
    divs.forEach( function(div) {
      if (
        div.getAttribute("data-checked") == String(checkbox.checked) &&
        [...directchildren].indexOf(div) != -1
      )
        div.style.display = "block";
      else if (
        div.getAttribute("data-checked") != String(checkbox.checked) &&
        [...directchildren].indexOf(div) != -1
      )
        div.style.display = "none";
    });
  }

  toggle(obj);
  obj.addEventListener("change", (e)=>{toggle(e.target)});
});

document.querySelectorAll("select.toggler").forEach(function(input) {
  function toggle(select) {
    console.log(select);
    var divs = select.parentNode.querySelectorAll("div");
    var directchildren = select.parentNode.children;
    divs.forEach( function(div) {
      if (
        div.getAttribute("data-option") == String(select.value) &&
        [...directchildren].indexOf(div) != -1
      )
        div.style.display = "block";
      else if (
        div.getAttribute("data-option") != String(select.value) &&
        [...directchildren].indexOf(div) != -1
      )
        div.style.display = "none";
    });
  }

  toggle(input);
  input.addEventListener("change", (e)=>{toggle(e.target)});
});

/* *** */

function todayBar() {
  var d = new Date();
  var weekdays = ["niedziela, ","poniedziałek, ","wtorek, ","środa, ","czwartek, ","piątek, ","sobota, "];
  var months = [" stycznia"," lutego"," marca"," kwietnia"," maja"," czerwca"," lipca"," sierpnia"," września"," października"," listopada"," grudnia"];
  var text = weekdays[d.getDay()]+d.getDate()+months[d.getMonth()];
  
  if (document.getElementById("date").innerHTML != text)
    document.getElementById("date").innerHTML = text;
}

function updateTask(tasks, oldtask, newtask) {
  var index = tasks.findIndex(obj => {
    return obj.id === oldtask.id;
  });
  tasks[index] = newtask;
  ipc.send("updatetasks", JSON.stringify(tasks));
}

function showWindow(window) {
  ipc.send("showwindow", window);
}

function showMode(mode) {
  ipc.send("showmode", mode);
}

function encodeDate(date) {
  return date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate(); 
}

function encodeTime(date) {
  return date.getHours()+":"+date.getMinutes(); 
}

function decodeDate(s) {
  var strdate = s.split("-");
  if (strdate[1]) strdate[1]--;
  var date = new Date(Date.UTC(...strdate));
  return date;
}

function getWhichWeekDay(date) {
  var weekday = date.getDay(); // dzień tygodnia
  var nweekday = 0; // który dzień tygodnia
  var nd = new Date(date.getTime());
  while (date.getMonth()==nd.getMonth()) {
    nweekday++;
    nd.setDate(nd.getDate()-7);
  }
  return nweekday;
}

function showForm(name, task, strdate) {
  document.getElementById(name+"-grayoverlay").style.display = "block";
  document.getElementById(name+"-grayoverlay").setAttribute("onclick", "hideForm('"+name+"')");
  var elems = document.forms[name];
  var d;
  var title = "";
  var description = "";
  editedtask = task;

  elems.getElementsByClassName("repeatbox")[0].style.display="none";
  elems.getElementsByClassName("clarifyrepeat")[0].style.display="none";

  function autosize(){
    var el = this;
    setTimeout(function(){
      el.style.cssText = 'height:auto; padding:0';
      // for box-sizing other than "content-box" use:
      // el.style.cssText = '-moz-box-sizing:content-box';
      el.style.cssText = 'height:' + el.scrollHeight + 'px';
    },0);
  }

  if (name=="show") {
    elems.getElementsByClassName("title")[0].setAttribute("data-id",task.id);
    d = new Date(Number(task.timeid));
    elems.getElementsByClassName("clarifyrepeat")[0].title = "";
    elems.getElementsByClassName("clarifyrepeat")[0].style.display = "none";
    title = task.title;
    description = task.description || "";
    var weekdays = ["niedziela","poniedziałek","wtorek","środa","czwartek","piątek","sobota"];
    if (task.repeat) {
      var amount = (task.repeat.amount==1)?"":task.repeat.amount+".";
      var units = {
        days: "dzień",
        weeks: "tydzień",
        months: "miesiąc",
        years: "rok"
      };
      elems.getElementsByClassName("repeatamount")[0].innerHTML = "co " + amount + " " + units[task.repeat.unit];
      if (task.repeat.unit == "months") {
        elems.getElementsByClassName("clarifyrepeat")[0].display = "inline";
        if(task.repeat.type == "sameday")
          elems.getElementsByClassName("clarifyrepeat")[0] += d.getDate()+ ". dzień każdego miesiąca\n";
        else {
          var nweekday = getWhichWeekDay(d);
          elems["clarifyrepeat"].title += nweekday+ ". "+weekdays[d.getDay()]+" każdego miesiąca\n";
        }
      } 
      elems.getElementsByClassName("repeatbox")[0].style.display="inline";
      if (task.repeat.end) {
        elems.getElementsByClassName("clarifyrepeat")[0].style.display = "inline";
        enddate = decodeDate(task.repeat.end);
        var dates = {
          year:""+enddate.getFullYear(),
          month:""+(enddate.getMonth()+1),
          day:""+enddate.getDate()
        };
        var c = ["month","day"];
        for (var i = 0; i < c.length; i++)
          if ( (""+dates[ c[i] ]).length < 2) dates[c[i]] = "0"+dates[c[i]];
        elems.getElementsByClassName("clarifyrepeat")[0].title += "Koniec zadania: "+dates.day + "/" + dates.month + "/" + dates.year;
      }
    }

    dates = {
      year:""+d.getFullYear(),
      hours:""+d.getHours(),
      minutes:""+d.getMinutes(),
      month:""+(d.getMonth()+1),
      day:""+d.getDate()
    };
    var c = ["hours","minutes","month","day"];
    for (var i = 0; i < c.length; i++)
      if (dates[c[i]] < 10) dates[c[i]] = "0"+dates[c[i]];

    document.getElementById(name+'box').style.display = 'block';

    elems.getElementsByClassName("title")[0].innerHTML = title;

    if (description) {
      elems["description"].value = description;
      elems["description"].style.cssText = 'height:auto; padding:0;';
      elems["description"].style.cssText = 'height:' + elems["description"].scrollHeight + 'px';
    } else elems["description"].style.display = "none";

    elems.getElementsByClassName("date")[0].innerHTML = weekdays[d.getDay()] + ", " + dates.day + "/" + dates.month + "/" + dates.year;
    elems.getElementsByClassName("time")[0].innerHTML = dates.hours + ":" + dates.minutes;

    return task;
  }
  
  elems["repeat"].checked = false;
  elems["repeatend"].checked = false;
  elems["color"][0].checked = true;
  elems.getElementsByClassName("endrepeatbox")[0].style.display="none";

  if (task) {
    editedtask = task;
    elems["title"].setAttribute("data-id",task.id);
    d = new Date(Number(task.timeid));
    title = task.title;
    description = task.description || "";
    if (task.repeat) {
      console.log(task.repeat);
      elems["repeatamount"].value = task.repeat.amount;
      elems["repeatunit"].value = task.repeat.unit;
      if (task.repeat.unit == "months") {
        elems["repeattype"].value = task.repeat.type;
        elems.getElementsByClassName(task.repeat.unit+'repeat')[0].style.display="block";
      } 
      elems.getElementsByClassName("repeatbox")[0].style.display="block";
      elems["repeat"].checked = true;
      if (task.repeat.end) {
        elems.getElementsByClassName("endrepeatbox")[0].style.display="block";
        elems["repeatend"].checked = true;
        enddate = decodeDate(task.repeat.end);
        var dates = {
          year:""+enddate.getFullYear(),
          month:""+(enddate.getMonth()+1),
          day:""+enddate.getDate()
        };
        var c = ["month","day"];
        for (var i = 0; i < c.length; i++)
          if ( (""+dates[ c[i] ]).length < 2) dates[c[i]] = "0"+dates[c[i]];
        elems["repeatenddate"].value = dates.year + "-" + dates.month + "-" + dates.day;
      }
      formClarify(name, d);
    }
    if (task.color)
      elems["color"].value=task.color;
  } else if (strdate) {
    d = decodeDate(strdate);
    var now = new Date();
    d.setMinutes(0);
    if(now.getHours()==23) {
      d.setHours(now.getHours());
      d.setMinutes(59);
    } else 
      d.setHours(now.getHours()+1);
    elems["repeat"].checked = false;
    elems.getElementsByClassName("repeatbox")[0].style.display="none";
  } else {
    d = new Date();
    d.setMinutes(0);
    d.setHours(d.getHours()+1);
    d.setDate(d.getDate()+7);
    elems["repeat"].checked = false;
    elems.getElementsByClassName("repeatbox")[0].style.display="none";
  }

  dates = {
    year:""+d.getFullYear(),
    hours:""+d.getHours(),
    minutes:""+d.getMinutes(),
    month:""+(d.getMonth()+1),
    day:""+d.getDate()
  };
  var c = ["hours","minutes","month","day"];
  for (var i = 0; i < c.length; i++)
    if ( (""+dates[ c[i] ]).length < 2) dates[c[i]] = "0"+dates[c[i]];

  document.getElementById(name+'box').style.display = 'block';

  elems["title"].value = title;

  elems["description"].value = description;
  elems["description"].style.cssText = 'height:auto; padding:0;';
  elems["description"].style.cssText = 'height:' + elems["description"].scrollHeight + 'px';
  elems["description"].addEventListener("keydown", autosize);

  elems["date"].value = dates.year + "-" + dates.month + "-" + dates.day;
  elems["time"].value = dates.hours + ":" + dates.minutes;

  // var today = new Date();
  // elems["date"].min =
  //   today.getFullYear() + "-" +
  //   (today.getMonth()<9 ? "0"+(today.getMonth()+1) : (today.getMonth()+1)) + "-" +
  //   (today.getDate()<10 ? "0"+today.getDate() : today.getDate());

  elems["title"].select();
}

function hideForm(name) {
  var task;
  if (editedtask)
    task = JSON.parse(JSON.stringify(editedtask));
  document.getElementById(name+"box").style.display = "none";
  document.getElementById(name+"-grayoverlay").style.display = "none";
  if (document.getElementById("showbox").style.display != "block")
    editedtask = {};

  return task || true;
}

function formClarify(name, date) {
  var task = getTaskFromForm(name,true);
  var d;
  if (!date)
    d = decodeDate(task.date)
  else d = date;
  var elems = document.forms[name];
  var value = elems["repeatunit"].value;
  var weekdays = ["niedziela","poniedziałek","wtorek","środa","czwartek","piątek","sobota"];
  switch (value) {
    case "months":
      // elems.getElementsByClassName("clarifyrepeat")[0].style.display="none";
      // elems.getElementsByClassName(value+'repeat')[0].style.display="inline";
      elems["repeattype"].children[0].innerHTML = d.getDate()+ ". dzień każdego miesiąca";
      var nweekday = getWhichWeekDay(d);
      elems["repeattype"].children[1].innerHTML = nweekday+ ". "+weekdays[d.getDay()]+" każdego miesiąca";
      break;
    default:
      console.log('formClarify - unknown value: '+value);
      break;
  }
}

function getTaskFromForm(name,silent) {
  var today = new Date();
  var elems = document.forms[name];
  var date = new Date(elems["date"].value);
  var repeat = false;
  var remind = false;

  if((!elems["title"].value || !elems["date"].value || !elems["time"].value)&&!silent){
    dialog.showMessageBoxSync(require("electron").remote.getCurrentWindow(),{type:"error", title:"Błąd", message:"Conajmniej jedno z pól nie jest uzupełnione."});
    require("electron").remote.getCurrentWindow().show();
    return;
  }

  date.setHours(elems["time"].value.substr(0,2));
  date.setMinutes(elems["time"].value.substr(3,5));

  if (date.getTime() < today.getTime() && !silent) {
    if (dialog.showMessageBoxSync(require("electron").remote.getCurrentWindow(), {
        type:"warning", 
        title:"Planowanie zadań wstecz",
        message: "Próbujesz planować zadanie wstecz",
        detail:"Czy na pewno chcesz je dodać?",
        buttons: ["Dodaj mimo to","Anuluj"]
      }) == 1) {
      require("electron").remote.getCurrentWindow().show();
      return false;
    } else require("electron").remote.getCurrentWindow().show();
  }

  if (elems["repeat"].checked) {
    var type = "";
    var types = {
      "months": elems["repeattype"].value
    };
    var end = false;
    if (elems["repeatend"].checked) {
      end = new Date(elems["repeatenddate"].value);
      if (end.getTime()<date.getTime() && !silent) {
        dialog.showMessageBoxSync(require("electron").remote.getCurrentWindow(), {
          type:"error", 
          title:"Zadanie cykliczne",
          message: "Data zakończenia zadania jest wcześniej od daty jego rozpoczęcia"
        });
        require("electron").remote.getCurrentWindow().show();
        return false;
      }
      end = encodeDate(end);
    }
    repeat = {
      amount: Number(elems["repeatamount"].value),
      unit: elems["repeatunit"].value,
      type: types[elems["repeatunit"].value],
      began: encodeDate(date),
      end: end
    };
  }

  if (elems["remind"].checked) {
    remind = {
      whenremind: elems["whenremind"].value 
    }
    switch (elems["whenremind"].value) {
      default:
      case "whendeadlineends":
        remind.reminddate = encodeDate(date);
        remind.remindtime = String(elems["time"].value);
        remind.timeid = date.getTime();
        break;
      case "5minsbefore":
        var time = date.getTime();
        var d;
        time -= 5*60*1000;
        d = new Date(time);

        remind.reminddate = encodeDate(d);
        remind.remindtime = encodeTime(d);
        remind.timeid = time;
        break;
      case "30minsbefore":
        var time = date.getTime();
        var d;
        time -= 30*60*1000;

        remind.reminddate = encodeDate(d);
        remind.remindtime = encodeTime(d);
        remind.timeid = time;
        break;
      case "1hourbefore":
        var time = date.getTime();
        var d;
        time -= 3600*1000;

        remind.reminddate = encodeDate(d);
        remind.remindtime = encodeTime(d);
        remind.timeid = time;
        break;
      case "1daybefore":
        var time = date.getTime();
        var d;
        time -= 24*3600*1000;

        remind.reminddate = encodeDate(d);
        remind.remindtime = encodeTime(d);
        remind.timeid = time;
        break;
      case "1weekbefore":
        var time = date.getTime();
        var d;
        time -= 7*24*3600*1000;

        remind.reminddate = encodeDate(d);
        remind.remindtime = encodeTime(d);
        remind.timeid = time;
        break;
      case "custom":
        remind.reminddate = elems["reminddate"];
        remind.remindtime = String(elems["remindtime"]);
        break;
    }
  }

  return {
    "id": Number(elems["title"].getAttribute("data-id")),
    "title": elems["title"].value,
    "description": elems["description"].value,
    "date": encodeDate(date),
    "time": String(elems["time"].value),
    "timeid": date.getTime(),
    "repeat": repeat,
    "color": elems["color"].value,
    "remind": remind,
    "priority": 1
  }
}

function addTask(name) {
  var task = getTaskFromForm(name);
  if (!task) return false;
  task = {...task, ...{
    "checked": false,
  }};

  schedule.orderedList.push(task);
  ipc.send("addtask", JSON.stringify(task));
  return task;
}

function editTask(name) {
  var task = getTaskFromForm(name);
  if (!task) return false;

  var taskindex = schedule.orderedList.findIndex(obj => {
    return obj.id == task.id
  });
  var task = {...task, ...{
    "id": task.id,
    "previousdate": editedtask.date,
    "olddate": editedtask.date,
    "isException": editedtask.isException || false,
    "path": editedtask.path || [],
    "checked": schedule.orderedList[taskindex].checked
  }};

  // preparing and sending

  ipc.send("edittask", JSON.stringify(task));
  require("electron").remote.getCurrentWindow().show();

  if (document.getElementById("showbox").style.display=="block")
    showForm('show', task);
  return task;
}

function deleteTask(task) { 
  if (dialog.showMessageBoxSync(require("electron").remote.getCurrentWindow(), {
    type:"warning", 
    title:"Usuwanie zadań",
    message: "Czy na pewno chcesz usunąć to zadanie?",
    detail:"Tej czynności nie można cofnąć!",
    buttons: ["Tak","Nie"]
  }) == 0) ipc.send("deletetask", task);
  require("electron").remote.getCurrentWindow().show();
  hideForm("show");
}

ipc.on("showform", function(event, arg) {
  showForm(arg[0], arg[1], arg[2]);
});

// keyboard shortcuts

Mousetrap.bind(['command+n', 'ctrl+n'], function(e) {
    for(var key in editedtask) {
      if(editedtask.hasOwnProperty(key)) 
        return false;
    }
    showForm("add");
    return false;
});

var editbox_shortcuts = new Mousetrap(document.getElementById("editbox"));
var addbox_shortcuts = new Mousetrap(document.getElementById("addbox"));
var showbox_shortcuts = new Mousetrap(document.getElementById("showbox"));

editbox_shortcuts.bind(['command+s', 'ctrl+s'],function(e) {
  if(editTask('edit'))hideForm('edit');
});

addbox_shortcuts.bind(['command+s', 'ctrl+s'],function(e) {
  if(addTask('add'))hideForm('add');
});

editbox_shortcuts.bind("escape",function(e) {
  hideForm('edit');
});

showbox_shortcuts.bind("escape",function(e) {
  hideForm('show');
});

addbox_shortcuts.bind("escape",function(e) {
  hideForm('add');
});

Mousetrap.bind(['command+p', 'ctrl+p'],function(e) {
  showWindow('settings')
});
