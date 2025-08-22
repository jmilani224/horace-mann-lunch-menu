const fs = require('fs');
const axios = require('axios');
const { format, addMonths } = require('date-fns');

const getLunchMenu = async () => {
  const now = new Date();

  let allLunchData = [];
  let allBreakfastData = [];

  for (let offset = 0; offset <= 1; offset++) {
    const targetDate = addMonths(now, offset);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;

    const lunchUrl = `https://myschoolmenus.com/api/organizations/1543/menus/104005/year/${year}/month/${month}/date_overwrites`;
    const breakfastUrl = `https://myschoolmenus.com/api/organizations/1543/menus/105963/year/${year}/month/${month}/date_overwrites`;

    try {
      const [lunchResponse, breakfastResponse] = await Promise.all([
        axios.get(lunchUrl),
        axios.get(breakfastUrl)
      ]);

      allLunchData = allLunchData.concat(lunchResponse.data.data);
      allBreakfastData = allBreakfastData.concat(breakfastResponse.data.data);
    } catch (error) {
      console.error(`Error fetching menu data for ${month}/${year}:`, error);
    }
  }

  // Map breakfast data by date for easy lookup
  const breakfastMap = {};
  allBreakfastData.forEach(day => {
    breakfastMap[day.day] = day;
  });

  let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//School Lunch Calendar//EN\n`;

  allLunchData.forEach(day => {
    const date = day.day.replace(/-/g, "");
    let lunchItems = '';
    let breakfastItems = '';

    try {
      const displayItems = JSON.parse(day.setting).current_display;
      lunchItems = formatMenu(displayItems);
    } catch (e) {
      console.error(`Error parsing lunch menu for ${date}:`, e);
    }

    try {
      if (breakfastMap[day.day]) {
        const breakfastDisplay = JSON.parse(breakfastMap[day.day].setting).current_display;
        breakfastItems = formatMenu(breakfastDisplay);
      }
    } catch (e) {
      console.error(`Error parsing breakfast menu for ${date}:`, e);
    }

    const fullDescription = `\n\n🍳 Breakfast Menu:${breakfastItems}\n\n\n🍽️ Lunch Menu:${lunchItems}`;

    icsContent += `\nBEGIN:VEVENT\nUID:${date}@schoollunch.com\nDTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}\nDTSTART;VALUE=DATE:${date}\nSUMMARY:Horace Mann Breakfast & Lunch\nDESCRIPTION:${escapeIcsText(fullDescription)}\nEND:VEVENT\n`;
  });

  icsContent += `END:VCALENDAR`;

  fs.writeFileSync('calendar.ics', icsContent);
  console.log("Calendar file generated!");
};

function formatMenu(displayItems) {
  const categoryMap = {};
  let currentCategory = '';

  displayItems.forEach(item => {
    if (item.type === "category") {
      currentCategory = item.name;
      if (!categoryMap[currentCategory]) {
        categoryMap[currentCategory] = [];
      }
    } else if (item.type === "recipe" && currentCategory) {
      categoryMap[currentCategory].push(item.name);
    }
  });

  let menuText = '';
  for (const [category, items] of Object.entries(categoryMap)) {
    menuText += `\n${getEmoji(category)} ${category}:\n`;
    items.forEach(item => {
      menuText += `- ${item}\n`;
    });
  }

  return menuText;
}

function getEmoji(category) {
  const map = {
    "Lunch Entree": "🌮",
    "Vegetables": "🥕",
    "Fruit": "🍎",
    "Milk": "🥛",
    "Misc.": "🧀",
    "Condiments": "🧂",
    "Breakfast Entree": "🥞",
    "Grains": "🌾"
  };
  return map[category] || '•';
}

function escapeIcsText(text) {
  return text
    .replace(/\\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n');
}

getLunchMenu();
