const DATA_URL = 'https://gameboy.github.io/dmgAPI/json/market.json'
const TITLE_REGEX = /\.|\\n|,/g
const BASE_DISCORD_URL = "discord://discordapp.com/channels/246604458744610816/336895311081373707/" // just add message_id

const BUY_EMOJI_REGEX = /<:WTB:\d*>|<:Buying:\d*>/g
const BUY = 'buy'
const SELL_EMOJI_REGEX = /<:WTS:\d*>|<:Selling:\d*>/g
const SELL = 'sell'
const TRADE_EMOJI_REGEX = /<:WTT:\d*>|<:Trading:\d*>/g
const TRADE = 'trade'

class DataFetcher {
  cachedListings() {
    return this.buildListings(JSON.parse(localStorage.getItem('listingData')) || []) 
  }

  async refreshListings() {
    return fetch(DATA_URL)
      .then((response) => {
        return response.json()
      })
      .then((jsonData) => {
        console.log(jsonData)
        if (jsonData.length > 0) {
          localStorage.setItem('listingData', JSON.stringify(jsonData))
          return this.buildListings(jsonData);
        } else {
          return null;
        }
      })
      .catch((error) => {
        console.log(error);
      })
  }

  buildListings(jsonData) {
    const listings = []
    for(let i = 0; i < jsonData.length; i++) {
      listings.push(new Listing(jsonData[i]))
    }
    return listings
  }
}

class Listing {
  constructor(messageData) {
    this.messageData = messageData
    this.messageId = messageData.message_id
    this.avatarUrl = messageData.avatar_url
    this.attachments = messageData.attachments

    this.message = messageData.message
    this.splitMessage = this.message.split('\n')
    this.words = this.splitMessage.map(line => line.split(' ')).flat()

    this.setListingType()
  }

  user() {
    return this.messageData.user
  }

  text() {
    return this.messageData.message
  }

  discordUrl() {
    return BASE_DISCORD_URL + this.messageId
  }

  postedDate() {
    if (!this._postedDate) {
      this._postedDate = new Date(this.messageData.created).toLocaleDateString()
    }
    return this._postedDate;
  }

  title() {
    if (!this._title) {
      let title = this.messageData.message.split(TITLE_REGEX)[0]
      if (title.length > 200) {
        title = title.substring(0, 197) + "...";
      }
      this._title = this.formatLineForWTSWTB(title)
    }

    return this._title
  }

  setListingType() {
    if (this._listingTypes === undefined) {
      this._listingTypes = this.listingTypesFromEmoji(this.message);
    }

    return this._listingTypes;
  }

  listingTypesFromEmoji(text) {
    const listingTypes = []
    if (this.message.match(SELL_EMOJI_REGEX)) { listingTypes.push(SELL) }
    if (this.message.match(BUY_EMOJI_REGEX)) { listingTypes.push(BUY) }
    if (this.message.match(TRADE_EMOJI_REGEX)) { listingTypes.push(TRADE) }
    return listingTypes;
  }

  sell() {
    return this._listingTypes.includes(SELL);
  }

  buy() {
    return this._listingTypes.includes(BUY);
  }

  trade() {
    return this._listingTypes.includes(TRADE);
  }

  imageUrls() {
    if (!this._imageUrls) {
      this._imageUrls = []

      if (this.attachments){
        for (let i = 0; i < this.attachments.length; i++) {
          this._imageUrls.push(this.attachments[i]);
        }
      }

      for (let i = 0; i < this.words.length; i++) {
        const word = this.words[i];
        if (word.match(/.jpg$|.gif$|.png$/g)) {
          this._imageUrls.push(word)
        }
      }
    }

    return this._imageUrls;
  }

  collapsedHtml() {
    if (!this._collapsedHtml) {
      this._collapsedHtml = ''
      for (let i = 0; i < this.splitMessage.length; i++) {
        const line = this.splitMessage[i]
        if (line == "") { this._collapsedHtml += "<br/>" }
        else {
          this._collapsedHtml += this.formatLine(this.splitMessage[i])
        }
      }
    }

    return this._collapsedHtml;
  }

  expandedHtml() {
    if (!this._expandedHtml) {
      this._expandedHtml = ''
      for (let i = 0; i < this.splitMessage.length; i++) {
        const line = this.splitMessage[i]
        if (line == "") { continue; }
        else {
          this._expandedHtml += `<p>${this.formatLine(this.splitMessage[i])}</p>`
        }
      }
    }

    return this._expandedHtml;  
  }

  formatLine(line) {
    let formattedLine = ''
    const words = line.split(' ')
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      if (word.match(/http/g)) {
        formattedLine += `<a href=${word}>${word}</a> `
      } else if (word.match(/(\d*)\$(\d*)/g)){
        formattedLine += `<span class="text-bold">${word}</span> `
      } else {
        formattedLine += `${word} `
      }
    }
    return this.formatLineForWTSWTB(formattedLine)
  }

  formatLineForWTSWTB(line) {
    let formattedLine = ''
    const words = line.split(' ')
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      if (word.match(/<:WTB:\d*>/g)) {
        formattedLine += 'WTB '
      } else if (word.match(/<:Buying:\d*>/g)) {
        formattedLine += 'Buying '
      } else if (word.match(/<:WTS:\d*>/g)) {
        formattedLine += 'WTS '
      } else if (word.match(/<:Selling:\d*>/g)) {
        formattedLine += 'Selling '
      } else if (word.match(/<:WTT:\d*>/g)) {
        formattedLine += 'WTT '
      } else if (word.match(/<:Trading:\d*>/g)) {
        formattedLine += 'Trading '
      } else {
        formattedLine += `${word} `
      }
    }
    return formattedLine
  }
}
