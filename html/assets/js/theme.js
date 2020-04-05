$('.datepicker').each(function(){
	var picker = new Pikaday({
		field: this
	});
});

function formatDate(date) {
    date = date.split("T");
    date[0] = date[0].slice(5, 10) + "-" + date[0].slice(0, 4);

    date[1] = date[1].slice(0, 5);
    var hour = date[1].slice(0,2) - 3;

    if (hour < 0) {
        hour = hour + 24;
    }
    if (hour > 12) {
        hour = (hour - 12) < 10 ? "0" + (hour - 12) : (hour - 12);
        date[1] = hour + date[1].slice(2, 5) + " PM";
    } else {
        date[1] += " AM";
    }

    temp = date[0];
    date[0] = date[1];
    date[1] = temp;

    return date.join(" ");
}