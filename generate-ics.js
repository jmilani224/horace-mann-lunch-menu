javascript
const fs = require('fs');
const axios = require('axios');
const { format } = require('date-fns');

const getLunchMenu = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const url = `https://myschoolmenus.com/api/organizations/1543/menus/74432/year/${year}/month/${month}/date_overwrites`;

  try {
    const response = await axios.get(url);
    const data = response.data.data;

    let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//School Lunch Calendar//EN\n`;

    data.forEach(day => {
      const date = day.day.replace(/-/g, "");
      let menuItems = '';

      try {
        const displayItems = JSON.parse(day.setting).current_display;
        const categoryMap = {};

        displayItems.forEach(item => {
          if (item.type === "recipe") {
            if (!categoryMap[item.category]) {
              categoryMap[item.category] = [];
            }
            categoryMap[item.category].push(item.name);
          }
        });

        for (const [category, items] of Object.entries(categoryMap)) {
          menuItems += `\n${category}:\n${items.join("\n")}`;
        }
      } catch (e) {
        console.error(`Error parsing menu for ${date}:`, e);
      }

      icsContent += `\nBEGIN:VEVENT\nUID:${date}@schoollunch.com\nDTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}\nDTSTART;VALUE=DATE:${date}\nSUMMARY:Horace Mann Lunch\nDESCRIPTION:${menuItems}\nEND:VEVENT\n`;
    });

    icsContent += `END:VCALENDAR`;

    fs.writeFileSync('calendar.ics', icsContent);
    console.log("Calendar file generated!");
  } catch (error) {
    console.error("Error fetching lunch menu:", error);
  }
};

getLunchMenu();

