// td.aRz J-KU role=heading
//  div#:3f.aAy aIf-aLe aE2 role=tab tabindex=0 aria-controls=:2t aria-label="Primary, one new message,"
//   div.aKw
//    div.aKy
//     div.aKx
//      div.aDg data-tooltip-align, data-tooltip="(me, the author)"
//        textContent="1 new"
//      div#:3a.aKz data-tooltip-align, data-tooltip=description
//        textContent=Primary

// .aKx correctly seems to only return the 5 tabs.
// And the 0th child of each's textContent will have the "N new" textContent,
// but the textContent does not get cleared when mooted, the node just gets
// style.display set to none.
// .aDG also (currently) works.  Maybe throw a mutation listener on that one
// for its textContent and/or display status changing and propagating a new
// details state.
