//(function() {

function fetchFriends(callback) {
  var req = new XMLHttpRequest();

  req.onload = function() {
    if (this.status !== 200) {
      callback('Request failed with code ' + this.status, null);
    }

    callback(null, JSON.parse(this.response));
  };
  req.onerror = function() {
    callback('Failed to send request', null);
  };

  req.open('GET', window.location + 'get-friends', true);
  req.send();
}

// Create and shuffle cards, returning an array of
// {content: {...}, pairId: '...', isFront: true/falsy},
// where both cards in a pair have same pairId.
// content contains either 'imageUrl' or both 'name' and 'screenName'
// keys.
function makeShuffledCards(users, numPairs) {
  // We may have more cards than we need, so only select some.
  var chosenUsers = _.sample(users, numPairs);

  return (_.chain(chosenUsers)
    .map(function(user) {
      return [
        {
          content: _.pick(user, 'imageUrl'),
          pairId: user.screenName,
          isFront: true
        },
        {
          content: _.pick(user, 'name', 'screenName'),
          pairId: user.screenName
        }
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
    var cardContent = '';
    var preloadImage = '';

    if (this.props.isFlipped) {
      classes += ' flipped';
      if (this.props.content.imageUrl) {
        cardContent = React.DOM.img({src: this.props.content.imageUrl});
      } else {
        cardContent = React.DOM.p(null,
          React.DOM.strong(null, this.props.content.name),
          React.DOM.br(),
          React.DOM.br(),
          '@' + this.props.content.screenName);
      }
    }

    if (this.props.content.imageUrl) {
      var style = {background: 'url(' + this.props.content.imageUrl +
          ') no-repeat -9999px -9999px'};
      preloadImage = React.DOM.div({style: style});
    }

    return React.DOM.div(
      {
        className: classes,
        onClick: !this.props.isFlipped ? this.handleClick : null
      },
      cardContent,
      preloadImage
    );
  },

  handleClick: function() {
    this.props.onFlip(this.props.key);
  }
});

var App = React.createClass({
  getInitialState: function() {
    return {
      cards: undefined,
      flipped: [],
      flips: 0
    };
  },

  componentDidMount: function() {
    fetchFriends(this.receiveFetchedFriends);
  },

  receiveFetchedFriends: function(err, data) {
    if (!this.isMounted()) return;
    if (err) throw err; // FIXME: show error
    this.setState({
      userData: data,
      cards: makeShuffledCards(data, NUM_PAIRS)
    });
  },

  restartGame: function() {
    this.setState({
      cards: makeShuffledCards(this.state.userData, NUM_PAIRS),
      flipped: [],
      flips: 0
    });
  },

  allCardsCollected: function() {
    return _.compact(this.state.cards).length === 0;
  },

  hasLoaded: function() {
    return !!this.state.cards;
  },

  render: function() {
    var that = this;

    if (!this.hasLoaded()) {
      return React.DOM.div({id: 'app'}, 'Loading');
    }

    if (this.allCardsCollected()) {
      return React.DOM.div({id: 'app'},
        React.DOM.h1({id: 'win-message'}, 'You win!'),
        React.DOM.h2(null, 'with ' + this.state.flips + ' card flips'),
        React.DOM.button({onClick: this.restartGame}, 'Play again'));
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
      }),
      React.DOM.p(null, this.state.flips + ' cards flipped'));
  },

  handleFlip: function(index) {
    if (this.state.flipped.length >= 2) return;

    var flipped = this.state.flipped.concat(index);
    this.setState({flipped: flipped, flips: this.state.flips + 1});

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
