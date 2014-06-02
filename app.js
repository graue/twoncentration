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
// {content: '...', pairId: '...', isFront: true/falsy},
// where both cards in a pair have same pairId.
function shuffledCards(cards, numPairs) {
  // We may have more cards than we need, so only select some.
  var chosenCards = _.sample(_.pairs(cards), numPairs);

  return (_.chain(chosenCards)
    .map(function(pair) {
      return [
        {content: pair[1][0], pairId: pair[0], isFront: true},
        {content: pair[1][1], pairId: pair[0]}
      ];
    })
    .flatten(true)
    .shuffle()
    .value());
}

var NUM_PAIRS = 12;
var UNFLIP_CARDS_DELAY = 1200;

var Card = React.createClass({
  render: function() {
    if (this.props.collected) {
      return React.DOM.div({className: 'card collected'});
    }

    var classes = 'card';
    if (this.props.isFlipped) classes += ' flipped';

    return React.DOM.div(
      {
        className: classes,
        onClick: !this.props.isFlipped ? this.handleClick : null
      },
      this.props.isFlipped
        ? React.DOM.p(null, this.props.content)
        : ''
    );
  },

  handleClick: function() {
    this.props.onFlip(this.props.key);
  }
});

var App = React.createClass({
  getInitialState: function() {
    return {
      cards: shuffledCards(CARDS, NUM_PAIRS),
      flipped: []
    };
  },

  render: function() {
    var that = this;

    // All cards collected?
    if (_.compact(this.state.cards).length === 0) {
      return React.DOM.div({id: 'app'},
        React.DOM.h1({id: 'win-message'}, 'You win!'));
    }

    return React.DOM.div({id: 'app'},
      this.state.cards.map(function(cardInfo, index) {
        if (!cardInfo) {
          return Card({key: index, collected: true});
        }

        var isFlipped = _.contains(that.state.flipped, index);

        return Card({
          key: index,
          pairId: cardInfo.pairId,
          content: cardInfo.content,
          isFlipped: isFlipped,
          onFlip: that.handleFlip
        });
      }));
  },

  handleFlip: function(index) {
    if (this.state.flipped.length >= 2) return;

    var flipped = this.state.flipped.concat(index);
    this.setState({flipped: flipped});

    if (flipped.length === 2) {
      setTimeout(this.unflipCards, UNFLIP_CARDS_DELAY);
    }
  },

  unflipCards: function() {
    var that = this;

    // Check if we have a match and collect the cards
    var pairIds = this.state.flipped.map(function(index) {
      return that.state.cards[index].pairId;
    });
    if (pairIds[0] === pairIds[1]) {
      // We collect cards by setting the element in this.state.cards to null
      var cards = _.clone(this.state.cards);
      this.state.flipped.forEach(function(index) {
        cards[index] = null;
      });
      this.setState({cards: cards});
    }
    this.setState({flipped: []});
  }
});

React.renderComponent(App(), document.getElementById('app-container'));

//})();
