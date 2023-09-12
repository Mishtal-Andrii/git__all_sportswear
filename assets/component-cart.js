if ( typeof CartForm !== 'function' ) {
	class CartForm extends HTMLElement {

		constructor(){
			super();
			this.ajaxifyCartItems();
		}

		ajaxifyCartItems(){
			this.form = this.querySelector('form');
			this.querySelectorAll('[data-js-cart-item]').forEach(item => {
				const remove = item.querySelector('.remove');

				if (remove) {
					remove.dataset.href = remove.getAttribute('href');
					remove.setAttribute('href', '');
					remove.addEventListener('click', (e)=>{
						e.preventDefault();

						this.updateCartQty(item, 0).then(res => {
              if((e.target.dataset.mainGroupProduct || e.target.dataset.mainBundleProduct) && res){
                this.removeAdditionalProducts(res, e.target.dataset.mainGroupProduct || e.target.dataset.mainBundleProduct)
              }
            })
					})
				}

				const qty = item.querySelector('.qty');
				if (qty) {
					qty.addEventListener('input', debounce(e => {
						e.preventDefault();
						e.target.blur();
						this.updateCartQty(item, parseInt(qty.value));
					}, 300));
					qty.addEventListener('click', (e)=>{
						e.target.select();
					})
				}
			})
		}

    removeAdditionalProducts(cart, mainProductId) {
      const updates = {};
      this.form.classList.add('processing');
  
      cart.items.forEach(item => {
        item.properties && Object.entries(item.properties).forEach(([key, value]) => {
          if(key === '_mainBundleProduct' && value === mainProductId){
            updates[item.key] = 0;
          } else {
            if(key === '_additionalProduct' && value === mainProductId){
              updates[item.key] = 0;
            }
          }
        })
      })

      fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: Object.keys(updates)
          .map((key) => `updates[${key}]=0`)
          .join('&'),
      })
        .then((res) => res.json())
        .then((res) => {
          console.log('after update', res)
        })
        .catch((error) => {
          console.error('Error removing additional products from cart:', error);
        })
        .finally(() => {
          window.refreshCart();
          this.form.classList.remove('processing');
        })
    }

		async updateCartQty(item, newQty){
			let alert = null;

			this.form.classList.add('processing');
			if ( this.querySelector('.alert') ) {
				this.querySelector('.alert').remove();
			}

      let updates = {}
      updates = {
        [item.dataset.id]: newQty
      };

      if (item.dataset.mainProduct) {
        const mainProductId = item.dataset.mainProduct || item.dataset.mainProduct;
        
        await fetch(KROWN.settings.routes.cart_url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/javascript' }
        }).then(res => res.json())
        .then(cart => {
          try {
            if(cart){
              cart.items.forEach(item => {
                item.properties && Object.entries(item.properties).forEach(([key, value]) => {
                  if(key === '_mainBundleProduct' && value === mainProductId) {
                    updates = {...updates, [item.key]: newQty}
                  } else {
                    if(key === '_additionalProduct' && value === mainProductId) {
                      updates = {...updates, [item.key]: newQty}
                    }
                  }
                })
              })
            }
          } catch (error) {}
        })
      }

      console.log('updates', updates)
      let cart = null

			// await fetch(KROWN.settings.routes.cart_change_url, {
			await fetch(KROWN.settings.routes.cart_update_url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'Accept': 'application/javascript' },
					body: JSON.stringify({ updates: updates })
				})
				.then(response => response.json())
				.then(response => {
          try {
            cart = response
          } catch (error) {}

					if ( response.status == 422 ) {
						// wrong stock logic alert
						alert = document.createElement('span');
						alert.classList.add('alert', 'alert--error');
						if ( typeof response.description === 'string' ) {
							alert.innerHTML = response.description;
						} else {
							alert.innerHTML = response.message;
						}
					}
					return fetch('?section_id=helper-cart');
				})
				.then(response => response.text())
				.then(text => {

					const sectionInnerHTML = new DOMParser().parseFromString(text, 'text/html');
					const cartFormInnerHTML = sectionInnerHTML.getElementById('AjaxCartForm').innerHTML;
					const cartSubtotalInnerHTML = sectionInnerHTML.getElementById('AjaxCartSubtotal').innerHTML;

					const cartItems = document.getElementById('AjaxCartForm');
					cartItems.innerHTML = cartFormInnerHTML;
					cartItems.ajaxifyCartItems();

					document.querySelectorAll('[data-header-cart-count]').forEach(elm=>{
						elm.textContent = cartItems.querySelector('[data-cart-count]').textContent;
					});
					document.querySelectorAll('[data-header-cart-total').forEach(elm=>{
						elm.textContent = cartItems.querySelector('[data-cart-total]').textContent;
					});

					if ( alert !== null ) {
						this.form.prepend(alert);
					} 

					document.getElementById('AjaxCartSubtotal').innerHTML = cartSubtotalInnerHTML;
							
					const event = new Event('cart-updated');
					this.dispatchEvent(event);

				})
				.catch(e => {
					console.log(e);
					let alert = document.createElement('span');
					alert.classList.add('alert', 'alert--error');
					alert.textContent = KROWN.settings.locales.cart_general_error;
					this.form.prepend(alert);
				})
				.finally(() => {
					this.form.classList.remove('processing');
				});

      return cart
		}

	} 


  if ( typeof customElements.get('cart-form') == 'undefined' ) {
		customElements.define('cart-form', CartForm);
	}

}

if ( typeof CartProductQuantity !== 'function' ) {

	class CartProductQuantity extends HTMLElement {
		constructor(){
			super();
			this.querySelector('.qty-minus').addEventListener('click', this.changeCartInput.bind(this));
			this.querySelector('.qty-plus').addEventListener('click', this.changeCartInput.bind(this));
		}
		changeCartInput(){
			setTimeout(()=>{
				document.getElementById('AjaxCartForm').updateCartQty(this.closest('[data-js-cart-item]'), parseInt(this.querySelector('.qty').value));
			}, 50);
		}
	}

  if ( typeof customElements.get('cart-product-quantity') == 'undefined' ) {
		customElements.define('cart-product-quantity', CartProductQuantity);
	}

}

// method for apps to tap into and refresh the cart

if ( ! window.refreshCart ) {

	window.refreshCart = () => {
		
		fetch('?section_id=helper-cart')
			.then(response => response.text())
			.then(text => {

			const sectionInnerHTML = new DOMParser().parseFromString(text, 'text/html');
			const cartFormInnerHTML = sectionInnerHTML.getElementById('AjaxCartForm').innerHTML;
			const cartSubtotalInnerHTML = sectionInnerHTML.getElementById('AjaxCartSubtotal').innerHTML;

			const cartItems = document.getElementById('AjaxCartForm');
			cartItems.innerHTML = cartFormInnerHTML;
			cartItems.ajaxifyCartItems();

			document.querySelectorAll('[data-header-cart-count]').forEach(elm=>{
				elm.textContent = cartItems.querySelector('[data-cart-count]').textContent;
			});
			document.querySelectorAll('[data-header-cart-total').forEach(elm=>{
				elm.textContent = cartItems.querySelector('[data-cart-total]').textContent;
			})
			
			document.getElementById('AjaxCartSubtotal').innerHTML = cartSubtotalInnerHTML;
			if ( document.querySelector('[data-js-site-cart-sidebar]') ) {
				document.querySelector('[data-js-site-cart-sidebar]').show();
				
			}

			if ( document.querySelector('cart-recommendations') ) {
				document.querySelector('cart-recommendations').innerHTML = '';
				document.querySelector('cart-recommendations').generateRecommendations();
			}

		})

	}

}

