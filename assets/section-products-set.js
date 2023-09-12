if (typeof ProductsSet !== 'function') {

  class ProductsSet extends HTMLElement {

    constructor() {

      super();

      this.initSet();
      this.checkSet();

      this.querySelector('[data-js-add-set-to-cart]').addEventListener('click', e => {
        const AllInputsCheck = document.querySelectorAll('.properties-input')
        let items = [];
        let isValid = true;
        let isCkecked = true;
        let additionaProductsCount = 0;
        let bundleSetIds = '';
        const bundleSetCustomId = new Date().getTime();

        bundleSetIds = Object.keys(this.set).map((key, index) => {
          if (this.set[key] !== null) {
            return this.set[key]
          }
        }).join('_');

        AllInputsCheck.forEach((prop, index) => {
          if (prop.hasAttribute('required') && prop.value === '') {
            prop.parentElement.parentElement.querySelector('.alarm-box').style.display = 'block'
            isValid = false;
          }

          if (prop.type === 'checkbox') {
            if (prop.hasAttribute('required') && prop.checked === false) {
              prop.parentElement.parentElement.parentElement.querySelector('.alarm-box').style.display = 'block'
              isCkecked = false
            }
          }
        });

        if (!isValid || !isCkecked) {
          return;
        }

        Object.keys(this.set).map((key, index) => {
          if (this.set[key] !== null) {
            const mainBundleVariantId = this.set[key];
            const AllInputs = [...this.querySelector(`[data-id="${key}"]`).parentNode.querySelectorAll('.properties-input')]
            const groupCustomId = new Date().getTime() + index;

            let propInput = {};
            propInput.bundle = true;

            AllInputs.forEach(item => {
              propInput[item.dataset.relatedProductPropertyName] = item.value;
            })

            // Additional products
            const setRelatedInput = document.querySelector(`input[value="${this.set[key]}"]`);
            const thisBundleProduct = setRelatedInput && setRelatedInput.closest('.product-item');
            const thisAdditionalProducts = thisBundleProduct && thisBundleProduct.querySelector('additional-products');
            const products = thisAdditionalProducts && thisAdditionalProducts.getAdditionalProducts();


            if(thisAdditionalProducts){
              // Bundle with additional products
              items.push({
                id: mainBundleVariantId,
                quantity: 1,
                properties: {
                  ...propInput,
                  ['_mainGroupProduct']: `${mainBundleVariantId}-${groupCustomId}`,
                  ['_mainBundleProduct']: `${bundleSetIds}-${bundleSetCustomId}`
                }
              });
            } else {
              // Main bundle products
              items.push({
                id: mainBundleVariantId,
                quantity: 1,
                properties: {
                  ...propInput,
                  ['_mainBundleProduct']: `${bundleSetIds}-${bundleSetCustomId}`
                }
              });
            }

            // Additional bundle products
            products && Object.entries(products).forEach(([key, data]) => {
              additionaProductsCount += 1;

              items.push({
                id: data.variantId,
                quantity: 1,
                properties: {
                  bundle: true,
                  [data.propertyName]: data.value,
                  ['_additionalProduct']: `${mainBundleVariantId}-${groupCustomId}`,
                  ['_mainBundleProduct']: `${bundleSetIds}-${bundleSetCustomId}`
                }
              })
            })
          }
        });

        if (items.length > 0) {
          const submitButton = this.querySelector('[data-js-add-set-to-cart]');
          submitButton.classList.add('working');

          window.handleAddToCart(
            JSON.stringify({
              'items': items
            }), 
              items.length - additionaProductsCount,
            {
              'Content-Type': 'application/json'
            },
            () => {
              submitButton.classList.remove('working');
              this.returnToDefaultSate();
            }
          );
        }

      });

    }

    initSet() {

      this.set = {};

      this.querySelectorAll('product-variants').forEach(elm => {
        if (!elm.hasAttribute('data-has-variants') && !elm.hasAttribute('data-unavailable')) {
          this.set[elm.dataset.id] = elm.parentNode.querySelector('input[name="id"]').value;
        } else {
          this.set[elm.dataset.id] = null;
          elm.addEventListener('VARIANT_CHANGE', e => {
            let variant = e.target.currentVariant;
            if (variant) {
              this.set[elm.dataset.id] = elm.parentNode.querySelector('input[name="id"]').value;
              elm.closest('[data-js-product-item]').classList.add('selected');
              /// elm.closest('toggle-tab').querySelector('[data-js-product-variant-title]').textContent = variant.title;
            } else {
              this.set[elm.dataset.id] = null;
              ///elm.closest('toggle-tab').querySelector('[data-js-product-variant-title]').textContent = '';
            }
            this.checkSet();
          })
        }
      });

    }

    checkSet() {

      let setFull = true;

      Object.keys(this.set).map(key => {
        if (this.set[key] === null) {
          setFull = false;
        }
      })

      if (setFull && this.classList.contains('products-set--empty')) {
        this.classList.remove('products-set--empty');
        this.querySelector('[data-js-add-set-to-cart-text]').textContent = KROWN.settings.locales.sets_add_to_cart;
      } else if (!setFull && !this.classList.contains('products-set--empty')) {
        this.classList.add('products-set--empty');
      }

      return setFull;

    }

    returnToDefaultSate() {
      this.querySelectorAll('product-variants').forEach(elm => {
        elm.querySelectorAll('input').forEach(input => {
          input.checked = false;
        })
        elm.querySelectorAll('select').forEach(select => {
          select.selectedIndex = 0;
        })
        if (!(!elm.hasAttribute('data-has-variants') && !elm.hasAttribute('data-unavailable'))) {
          elm.currentVariant = undefined;
          elm.parentNode.querySelector('[data-js-product-add-to-cart]').classList.add('disabled');
        }
      });
      this.querySelectorAll('[data-js-product-item]').forEach(elm => {
        elm.classList.remove('selected');
      });
      this.initSet();
      this.checkSet();
      this.querySelector('[data-js-add-set-to-cart-text]').textContent = KROWN.settings.locales.sets_choose_products;
    }

  }

  if (typeof customElements.get('products-set') == 'undefined') {
    customElements.define('products-set', ProductsSet);
  }

}