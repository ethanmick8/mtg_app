function confirmOrderSubmit(e) {
    // Get a reference to the form element
    var cards = document.querySelector('input[name="cards"]').value;
    var confirm = confirm('Are you sure you want to place this order?\n\nTotal Price: ');
    console.log('fat');
    // Submit the form
    form.submit();
}
  
  // formats SQL date for user display
  function formatDate(dateString) {
    var dateArray = dateString.split('-');
  
    var year = dateArray[0];
    var month = dateArray[1];
    var day = dateArray[2];
  
    var date = new Date(year, month - 1, day);
  
    var monthName = date.toLocaleString('en-us', { month: 'long' });
  
    var daySuffix = getOrdinalSuffix(day);
  
    return monthName + ' ' + day + daySuffix + ', ' + year;
  }
  
  function getOrdinalSuffix(day) {
    if (day === 1) {
      return 'st';
    } else if (day === 2) {
      return 'nd';
    } else if (day === 3) {
      return 'rd';
    } else {
      return 'th';
    }
  }
  
  /* function computeTotalPrice(prices, quantities) {
    var total;
    for (let i = 0; i < prices.length; i++) { // add each price
      for (let j = 0; j < quantities[i].length; j++) { // add for each instance of the card
        total = total + prices[i];
      }
    }
    return total;
  } */
  
  /* remnant
  function getNumCards(inputString) {
    // split the input string on the comma character to get an array of values
    const values = inputString.split(",");
    
    // return the length of the array of values
    return values.length;
  } */
  
  function stringToArray(str) {
    // split the string on the commas to create an array of individual values
    var arr = str.split(",");
    return arr;
  }
  
  function cardCount(arr, value) {
    // determine the amount of times the same card was included in the order list
    var count = 0;
  
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] == value) {
        count++;
      }
    }
    return count;
  }
  
  // Function that sorts an array of card muid's grouped by duplicates
  function groupIdenticalStrings(strings) {
    strings.sort();
  
    let groupedStrings = [];
  
    // Iterate over the strings array and group identical strings together
    let currentString = strings[0];
    let currentStringCount = 1;
    for (let i = 1; i < strings.length; i++) {
      if (strings[i] === currentString) {
        currentStringCount++;
      } else {
        groupedStrings.push({ string: currentString, count: currentStringCount });
        currentString = strings[i];
        currentStringCount = 1;
      }
    }
  
    groupedStrings.push({ string: currentString, count: currentStringCount });
  
    // Create a new array to store the result
    let result = [];
  
    for (let i = 0; i < groupedStrings.length; i++) {
      for (let j = 0; j < groupedStrings[i].count; j++) {
        result.push(groupedStrings[i].string);
      }
    }
  
    return result;
  }

  export { formatDate, getOrdinalSuffix, stringToArray, cardCount, groupIdenticalStrings  };


  