const DATA_URL = 'https://gameboy.github.io/dmgAPI/market.json'
const TITLE_REGEX = /\.|\\n|,/g
const BUY_REGEX = /buy|buying|WTB|looking|trade/ig
const WTB_REGEX = /WTB/g
const BUY = 'buy'
const SELL_REGEX = /sell|selling|WTS|shipped/ig
const WTS_REGEX = /WTS/g
const SELL = 'sell'
const SELL_MONEY_REGEX = /\$|€/ig
const BASE_DISCORD_URL = "discord://discordapp.com/channels/246604458744610816/336895311081373707/" // just add message_id

const BUY_OVERRIDES = {
  '706854690834350082': true,
  '705304855895605318': true,
  '704512974827552770': true,
  '699381569122598924': true,
  '710736584479342663': true, // May 15
  '710616567972364309': true, // May 14
}
const SELL_OVERRIDES = {
  '703956817184555048': true,
  '704437780578828319': true,
  '707823474957090886': true,
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
      try {
        this._postedDate = new Date(Date.parse(this.messageData.created)).toLocaleDateString()
      } catch {
        this._postedDate = `${this.messageData.created.slice(0, 10)} UTC`
      }
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
    if (this._listingType === undefined) {
      if (SELL_OVERRIDES[this.messageId]) {
        this._listingType = SELL;
      } else if (BUY_OVERRIDES[this.messageId]) {
        this._listingType = BUY;
      } else if (this.message.match(WTS_REGEX) && !this.message.match(WTB_REGEX)) {
        this._listingType = SELL;
      } else if (this.message.match(WTB_REGEX) && !this.message.match(WTS_REGEX)) {
        this._listingType = BUY;
      } else if (this.message.match(SELL_REGEX)) {
        this._listingType = SELL;
      } else if (this.message.match(BUY_REGEX)) {
        this._listingType = BUY;
      } else if (this.message.match(SELL_MONEY_REGEX)) {
        this._listingType = SELL;
      } else {
        this._listingType = null;
      }
    }

    return this._listingType;
  }

  sell() {
    return this._listingType == SELL;
  }

  buy() {
    return this._listingType == BUY;
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
      } else {
        formattedLine += `${word} `
      }
    }
    return formattedLine
  }
}
