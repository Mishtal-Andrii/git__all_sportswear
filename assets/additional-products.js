
if (!customElements.get('additional-products')) {
  class AdditionalProduct extends HTMLElement {
    constructor(){
      super();

      this.checkbox_input = this.querySelectorAll('input[type="checkbox"]');
      this.text_input = this.querySelectorAll('input[type="text"]');
      this.number_input = this.querySelectorAll('input[type="number"]');
      this.additionalProducts = {};
      this.product_variants = document.querySelector('product-variants');
      this.defaultVariant = document.querySelector('product-variants[data-variant-price]');
      this.defaultVariantPrice = this.defaultVariant && this.defaultVariant.dataset.variantPrice;
      this.priceEl = document.querySelector('[data-js-product-price-original]');
    }

    connectedCallback() {
      this.checkbox_input.forEach(inp => inp.addEventListener('change', this.handleInputChange.bind(this)))
      this.text_input.forEach(inp => inp.addEventListener('keyup', this.handleInputChange.bind(this)))
      this.number_input.forEach(inp => inp.addEventListener('keyup', this.handleInputChange.bind(this)))
      this.addEventListener('on:variant:change', this.handleVariantChange.bind(this))
    }

    disconnectedCallback() {
      this.checkbox_input.forEach(inp => inp.removeEventListener('change', this.handleInputChange.bind(this)))
      this.text_input.forEach(inp => inp.removeEventListener('keyup', this.handleInputChange.bind(this)))
      this.number_input.forEach(inp => inp.removeEventListener('keyup', this.handleInputChange.bind(this)))
      this.removeEventListener('on:variant:change', this.handleVariantChange.bind(this))
    }

    /**
     * Get items quantity from old and new cart
     * to compare if quantity was updated automatically
     * @param {?number} quantity - main product quantity
     */
    handlePriceChange(quantity) {
      this.defaultVariantPrice = this.defaultVariant && this.defaultVariant.dataset.variantPrice;

      let priceSumm = 0

      this.defaultVariantPrice && (priceSumm += parseInt(this.defaultVariantPrice));
      
      Object.entries(this.additionalProducts).forEach(([key, product]) => {
        product.price && (priceSumm += product.price)
      })

      if(quantity) priceSumm = priceSumm * quantity

      const formattedPrice = this.product_variants && this.product_variants._formatMoney(priceSumm, KROWN.settings.shop_money_format);

      if(this.closest('.product-item')){
        this.priceEl = this.closest('.product-item').querySelector('[data-js-product-price-original]');
      }

      formattedPrice && this.priceEl && (this.priceEl.textContent = formattedPrice);
      this.priceEl.textContent = formattedPrice
    }

    handleVariantChange(evt){
      if(evt.detail.variant){
        this.defaultVariantPrice = evt.detail.variant.price
      }
      
      this.handlePriceChange();
    }

    handleInputChange(evt){
      const target = evt.target;
      const { name, type, value, required, dataset, checked } = target;
      const { relatedProduct, relatedProductPrice, relatedProductPropertyName, relatedProductId } = dataset

      if(!relatedProduct) {
        console.warn('No related product assigned')
        return
      }

      this.additionalProducts[relatedProduct] = {
        name,
        type,
        value,
        required,
        price: parseInt(relatedProductPrice),
        propertyName: relatedProductPropertyName,
        mainGroupProduct: relatedProductId,
        variantId: parseInt(relatedProduct.split('-')[0]),
      }

      if(type == 'checkbox' && !checked){
        delete this.additionalProducts[relatedProduct]
      }
      
      if(!value || value === '') {
        delete this.additionalProducts[relatedProduct]
      }

      console.log('this.additionalProducts', this.additionalProducts)
      this.handlePriceChange();
    }

    getAdditionalProducts() {
      return this.additionalProducts
    }
  }

  customElements.define('additional-products', AdditionalProduct);
}
