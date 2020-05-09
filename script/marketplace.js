const DATA_URL = 'https://gameboy.github.io/dmgAPI/market.json'
const TITLE_REGEX = /\.|\\n|,/g
const BUY_REGEX = /buy|buying|WTB|looking|trade/ig
const SELL_REGEX = /sell|selling|WTS/ig
const BASE_DISCORD_URL = "discord://discordapp.com/channels/246604458744610816/336895311081373707/" // just add message_id

const BUY_OVERRIDES = {
  '706854690834350082': true,
  '705304855895605318': true,
  '704512974827552770': true,
  '699381569122598924': true
}
const SELL_OVERRIDES = {
  '703956817184555048': true,
  '704437780578828319': true,
  '707823474957090886': true
}

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
    this.created = `${messageData.created.slice(0, messageData.created.length - 7)} UTC`
    this.avatarUrl = messageData.avatar_url
    this.attachments = messageData.attachments

    this.splitMessage = messageData.message.split('\n')
    this.words = this.splitMessage.map(line => line.split(' ')).flat()
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

  title() {
    if (!this._title) {
      let title = this.messageData.message.split(TITLE_REGEX)[0]
      if (title.length > 200) {
        title = title.substring(0, 197) + "...";
      }
      this._title = title
    }

    return this._title
  }

  sell() {
    if (!this._sell && !BUY_OVERRIDES[this.messageId]) {
      this._sell = SELL_OVERRIDES[this.messageId] || false;

      for (let i = 0; i < this.words.length; i++) {
        const word = this.words[i];
        if (word.match(SELL_REGEX)) {
          this._sell = true;
          break;
        }
      }

      if ((this.attachments[0]) || (this.messageData.message.match(/\$/g) || []).length > 1) {
        this._sell = true;
      }
    }

    return this._sell;
  }

  buy() {
    if (!this._buy && !SELL_OVERRIDES[this.messageId]) {
      this._buy = BUY_OVERRIDES[this.messageId] || false;

      for (let i = 0; i < this.words.length; i++) {
        const word = this.words[i];
        if (word.match(BUY_REGEX) && !this.sell()) { // sell can not reference buy or infinite loop will happen!
          this._buy = true;
        }
      }
    }

    return this._buy;
  }

  imageUrls() {
    if (!this._imageUrls) {
      this._imageUrls = []

      if (this.attachments && this.attachments.length > 0) {
        if (this.attachments.slice(0,2) == "['") {
          this._imageUrls.push(this.attachments.slice(2, this.attachments.length - 2))
        } else {
          this._imageUrls.push(this.attachments)
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
    return formattedLine
  }
}
