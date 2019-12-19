/** @OnlyCurrentDoc */

/**
* Ugly, brute-force Multi-Dimensional Unbounded Knapsack
*/
function MDUKNAPSACK(elementsCells, actionConstraint, amountConstraint, resultsLength) {
  // Let me know how to debug here :shrug:
  // elementsCells = elementsCells || [["Task 1", 10000, 100, 300], ["Task 2", 25000, 225, 675]];
  // actionConstraint = actionConstraint || 50000;
  // amountConstraint = amountConstraint || 5;
  resultsLength = resultsLength || 1;
  
  /* Init variables */
  var knapsack = { action: actionConstraint, amount: amountConstraint };
  var elements = elementsCells
  .map(function(elementCells) { return { name: elementCells[0], action: elementCells[1], basePoint: elementCells[2], point: elementCells[3] } })
  .reduce(function(acc, cur, i) { acc[cur.name] = cur; return acc; }, {});
  
  /* Helper */
  function range(lower, upper) {
    return Array.apply(null, Array(upper)).map(function (_, i) {return i + lower;});
  }
  function cartesian(arg) {
    var r = [], /*arg = arguments,*/ max = arg.length-1;
    function helper(arr, i) {
      for (var j=0, l=arg[i].length; j<l; j++) {
        var a = arr.slice(0); // clone arr
        a.push(arg[i][j]);
        if (i==max)
          r.push(a);
        else
          helper(a, i+1);
      }
    }
    helper([], 0);
    return r;
  }
  
  /* Determine max amount & possibilities for each element */
  Object.keys(elements).forEach(function(key) {
    elements[key].max = Math.min(Math.floor(knapsack.action / elements[key].action), knapsack.amount);
    elements[key].possibilities = range(0, elements[key].max + 1);
  });
  var possibilities = cartesian(Object.keys(elements).map(function(key) { return elements[key].possibilities; }))
  .filter(function(possibility) { return possibility.reduce(function(acc, cur) { return acc + cur }, 0) <= knapsack.amount }) // Real but expensive
  // .filter(function(possibility) { return possibility.reduce(function(acc, cur) { return acc + cur }, 0) == knapsack.amount }) // Approximated but cheap
  .map(function(possibility) {
    return {
      possibility: possibility,
      action: possibility.reduce(function(acc, cur, i) { return acc + cur * elements[Object.keys(elements)[i]].action; }, 0),
      point: possibility.reduce(function(acc, cur, i) { return acc + cur * elements[Object.keys(elements)[i]].point; }, 0)
    }
  })
  .filter(function(possibility) { return possibility.action <= knapsack.action; })
  .sort(function(possibilityA, possibilityB) { return possibilityB.point - possibilityA.point })
  .slice(0, resultsLength)
  .map(function(possibility) { return possibility.possibility.concat([possibility.action, possibility.point]) });
  return possibilities;
}