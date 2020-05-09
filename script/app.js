Vue.component('filtering', {
  props: ['listings', 'filteredLength'],
  data: function() {
    return {
      searchTerm: "",
      buying: true,
      selling: true,
      unknown: true
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
    filterActive: function () {
      return (
        this.trimmedSearchTerm.length >= 3 ||
        !this.buying ||
        !this.selling ||
        !this.unknown
      )
    }
  },
  methods: {
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
      if (this.buying && listing.buy()) { return true }
      else if (this.selling && listing.sell()) { return true }
      else if (this.unknown && !listing.buy() && !listing.sell()) { return true }
      return false;
    },
    searchFilter(listing) {
      return listing.text().match(new RegExp(this.trimmedSearchTerm, 'ig'));
    }
  },
  template: `
    <div class='filtering row'>
      <div class='search col-sm-7'>
        <input type='text' v-model:value="searchTerm" placeholder="Enter a search term" class="form-control form-control-sm" @keyup="emitFilteredListings"/>
        <span class='filter-count'>{{countString}}</span>
      </div>
      <div class='type-filter col-sm-5'>
        <input type="checkbox" id="show-selling" v-model="selling" @change="emitFilteredListings"/>
        <span class="badge badge-primary"><label for="show-selling">Selling</label></span>
        <input type="checkbox" id="show-buying" v-model="buying" @change="emitFilteredListings"/>
        <span class="badge badge-success"><label for="show-buying">Buying</label></span>
        <input type="checkbox" id="show-unknown" v-model="unknown" @change="emitFilteredListings"/>
        <span class="badge badge-secondary"><label for="show-unknown">???</label></span>
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
      return (!this.listing.buy() && !this.listing.sell())
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
          <div v-if="!imageUrl" class="no-image"></div>
          <a v-if="imageUrl" :href="imageUrl"><img  :src="imageUrl" class="card-img"></a>
        </div>
        <div :class="{ 'col-md-9': imageUrl, 'col-md-12': !imageUrl }">
          <div class="card-body" @click="expand">
            <h5 class="card-title">
              <span v-if="listing.sell()" class="badge badge-primary">Selling</span>
              <span v-if="listing.buy()" class="badge badge-success">Buying</span>
              <span v-if="unknown" class="badge badge-secondary">???</span>
              {{listing.title()}}

              <div class="created">
                <span class="text-muted">
                  posted
                  {{ listing.created }}
                  by
                </span>
                <img width="20" class="discord-avatar" :src="listing.avatarUrl">
                <span>{{listing.user()}}</span>
              </div>
            </h5>

            <p class="card-text listing-text" v-html="bodyHtml" ref="text"></p>

            <div class="row listing-footer">
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
        this.$refs[this.listings[i].messageId][0].close()
      }
    },
    updateFilteredListings: function(filteredListings) {
      this.filteredListings = filteredListings;
    }
  }
});
