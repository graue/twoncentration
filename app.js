//(function() {

var CARDS = generateTestCards();

// Return generated test cards that have A, B, C... on one side and 1, 2, 3...
// on the other. Unshuffled cards are stored as a map from IDs (can be any
// string; in this case, the letter) to [first, second] pairs – where 'first'
// and 'second' are the (string, currently) contents of each card in the pair.
function generateTestCards() {
  var cards = {};
  for (var i = 0; i < 26; i++) {
    var letter = String.fromCharCode(65 + i); // A, B, C...
    cards[letter] = [letter, (i+1) + ''];
  }
  return cards;
}

// Shuffle the cards, returning an array of:
// {content: '...', id: '...', isFront: true/falsy},
// where id is the id of the pair (both cards in a pair have same id).
function shuffledCards(cards, numPairs) {
  // We may have more cards than we need, so only select some.
  var chosenCards = _.sample(_.pairs(cards), numPairs);

  return (_.chain(chosenCards)
    .map(function(pair) {
      return [
        {content: pair[1][0], id: pair[0], isFront: true},
        {content: pair[1][1], id: pair[0]}
      ];
    })
    .flatten(true)
    .shuffle()
    .value());
}

var NUM_PAIRS = 12;

var Card = React.createClass({
  render: function() {
    return React.DOM.div({className: 'card'},
      React.DOM.p(null, 'Contents: ' + this.props.content));
  }
});

var App = React.createClass({
  getInitialState: function() {
    return {
      cards: shuffledCards(CARDS, NUM_PAIRS)
    };
  },

  render: function() {
    return React.DOM.div({className: 'app'},
      this.state.cards.map(function(cardInfo) {
        var key = cardInfo.id + (cardInfo.isFront ? 'F' : 'B');
        return Card(_.extend({key: key}, cardInfo));
      }));
  }
});

React.renderComponent(App(), document.getElementById('app-container'));

//})();
