test("Popcorn Candy Plugin", function () {
  
  var popped = Popcorn("#video"),
      expects = 6,
      count = 0,
      interval,
      interval2,
      candydiv = document.getElementById('candydiv');
  
  expect( expects );
  
  function plus() {
    if ( ++count === expects) {
      start();
    }
  }

  stop();
 
  ok('candy' in popped, "candy is a method of the popped instance");
  plus();

  equals ( candydiv.innerHTML, "", "initially, there is nothing inside the candydiv" );
  plus();
  
  popped.candy({
    start: 5, // seconds
    end: 15, // seconds
    effect: 'xray',
    target: 'candydiv'
  } );

  interval = setInterval( function() {
    if( popped.currentTime() > 5 && popped.currentTime() < 15 ) {
      ok( /display: inline;/.test( candydiv.innerHTML ), "Div contents are displayed" );
      plus();
      ok( /video/.test( candydiv.innerHTML ), "A video exists" );
      plus();
      ok( /canvas/.test( candydiv.innerHTML ), "A canvas exists" );
      plus();
      clearInterval( interval );
    }
  }, 500);
  
  interval2 = setInterval( function() {
    if( popped.currentTime() > 15 ) {
      ok( /display: none;/.test( candydiv.innerHTML ), "Div contents are hidden again" );
      plus();
      clearInterval( interval2 );
    }
  }, 500);
  
  popped.play();
  
});
