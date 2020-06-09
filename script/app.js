Vue.component('filtering', {
  props: ['listings', 'filteredLength'],
  data: function() {
    return {
      searchTerm: "",
      state: 'all'
    }
  },
  computed: {
    trimmedSearchTerm: function() {
      return this.searchTerm.trim();
    },
    countString: function() {
      if (!this.filterActive) {
        return ''
      } else {
        return `showing ${this.filteredLength} of ${this.listings.length}`
      }
    },
    filterActive: function() {
      return this.trimmedSearchTerm.length >= 3 || this.state != 'all'
    },
  },
  methods: {
    clearSearch(){
      this.searchTerm = "";
      this.emitFilteredListings();
    },
    emitFilteredListings() {
      this.$emit(
        'filtered-listings-updated',
        this.listings.filter((listing) => {
          if (this.filterActive) {
            return this.searchFilter(listing) && this.typeFilter(listing);
          } else {
            return this.typeFilter(listing);
          }
        })
      );
    },
    typeFilter(listing) {
      if (this.state == 'all') { return true }
      else if (this.state == 'sell' && listing.sell()) { return true }
      else if (this.state == 'buy' && listing.buy()) { return true }
      else if (this.state == 'trade' && listing.trade()) { return true }
      return false;
    },
    searchFilter(listing) {
      return listing.text().match(new RegExp(this.trimmedSearchTerm, 'ig'));
    },
    setState(state) {
      this.state = state;
      this.emitFilteredListings();
    }
  },
  template: `
    <div class='filtering row'>
      <div class='search col-sm-7'>
        <input type='text' aria-label="search" v-model:value="searchTerm" placeholder="Enter a search term" class="form-control form-control-sm" @keyup="emitFilteredListings"/>
        <button class="clear-btn btn btn-link" v-if="searchTerm.length > 0" @click="clearSearch">✗</button>
        <span class='filter-count'>{{countString}}</span>
      </div>

      <div class="col-sm-5">
        <div class="type-filter tfbg btn-group" role="group">
          <button type="button" class="btn btn-sm btn-light" :class="{selected: state == 'all'}" @click="setState('all')">All</button>
          <button type="button" class="btn btn-sm btn-primary" :class="{selected: state == 'sell'}" @click="setState('sell')">Selling</button>
          <button type="button" class="btn btn-sm btn-success" :class="{selected: state == 'buy'}" @click="setState('buy')">Buying</button>
          <button type="button" class="btn btn-sm btn-trading" :class="{selected: state == 'trade'}" @click="setState('trade')">Trading</button>
        </div>
      </div>
    </div>
  `
});

Vue.component('listing-card', {
  props: ['listing', 'closeFunction'],
  data: function() {
    return {
      expanded: false,
    }
  },
  computed: {
    imageUrl: function() {
      return this.listing.imageUrls()[0]
    },
    unknown: function() {
      return (!this.listing.buy() && !this.listing.sell() && !this.listing.trade())
    },
    bodyHtml: function() {
      return (this.expanded ? this.listing.expandedHtml() : this.listing.collapsedHtml())
    }
  },
  methods: {
    expand: function(e) {
      this.$emit('close-all')
      this.expanded = true
      e.stopImmediatePropagation()
    },
    close: function() {
      this.expanded = false
    },
    toggleExpanded: function(e){
      this.expanded = !this.expanded
      e.stopImmediatePropagation()
    }
  },
  template: `
    <div class="card" :class="{expanded: expanded}">
      <div class="row no-gutters">
        <div :class="{ 'col-md-3': imageUrl }">
          <a v-if="imageUrl" :href="imageUrl"><img :src="imageUrl" class="card-img"></a>
        </div>
        <div :class="{ 'col-md-9': imageUrl, 'col-md-12': !imageUrl }">
          <div class="card-body" @click="expand">
            <h5 class="card-title">
              <span :title="listing.matchType">
                <span v-if="listing.sell()" class="badge badge-primary">Selling</span>
                <span v-if="listing.buy()" class="badge badge-success">Buying</span>
                <span v-if="listing.trade()" class="badge badge-trading">Trading</span>
                <span v-if="unknown" class="badge badge-secondary">???</span>
              </span>
              {{listing.title()}}

              <div class="created">
                <span class="text-muted">
                  posted
                  {{ listing.postedDate() }}
                  by
                </span>
                <img width="20" class="discord-avatar" :src="listing.avatarUrl">
                <span>{{listing.user()}}</span>
              </div>
            </h5>

            <p class="card-text listing-text" v-html="bodyHtml" ref="text"></p>

            <div class="row listing-footer align-items-end">
              <div class="col-9">
                <a :href="listing.discordUrl()" target="_blank" class="btn btn-sm btn-outline-info">Open In Discord</a>
              </div>
              <div class="col-3">
                <button class="btn btn-sm btn-outline-secondary pull-right" @click="toggleExpanded">
                  {{ expanded ? '▲' : '▼' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
});

let app = new Vue({
  el: '#app',
  data: {
    listings: (new DataFetcher).cachedListings(),
    filteredListings: null
  },
  mounted: async function() {
    this.filteredListings = this.listings;
    const newListings = await (new DataFetcher).refreshListings();
    if (newListings) {
      this.listings = newListings;
      this.filteredListings = newListings;
    }
  },
  computed: {
    safeFilteredListingsLength: function() {
      if (this.filteredListings) {
        return this.filteredListings.length
      } else {
        return this.listings.length
      }
    }
  },
  methods: {
    closeAll: function() {
      for (let i = 0; i < this.listings.length; i++) {
        const listing = this.$refs[this.listings[i].messageId][0]
        if (listing) { listing.close() }
      }
    },
    updateFilteredListings: function(filteredListings) {
      this.filteredListings = filteredListings;
    }
  }
});
