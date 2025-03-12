const fs = require('fs');
const axios = require('axios');
const { format } = require('date-fns');

const getLunchMenu = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-based

    const url = `https://myschoolmenus.com/api/organizations/1543/menus/74432/year/${year}/month/${month}/date_overwrites`;

    try {
        const response = await axios.get(url);
        const data = response.data.data;
        
        let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//School Lunch Calendar//EN\n`;

        data.forEach(day => {
            const date = day.day.replace(/-/g, ""); // Format YYYYMMDD
            const menuItems = JSON.parse(day.setting).current_display
                .filter(item => item.type === "recipe")
                .map(item => item.name)
                .join(", ");

            icsContent += `
BEGIN:VEVENT
UID:${date}@schoollunch.com
DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}
DTSTART;VALUE=DATE:${date}
SUMMARY:Horace Mann Lunch
DESCRIPTION:${menuItems}
END:VEVENT
`;
        });

        icsContent += `END:VCALENDAR`;

        fs.writeFileSync('calendar.ics', icsContent);
        console.log("Calendar file generated!");
    } catch (error) {
        console.error("Error fetching lunch menu:", error);
    }
};

getLunchMenu();
