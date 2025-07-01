// script.js

function cargarProductosDesdeAPI() {
  fetch("http://localhost:8080/api/productos")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al obtener productos");
      }
      return response.json();
    })
    .then((productos) => mostrarProductosEnPantalla(productos))
    .catch((error) => console.error("Error al cargar productos:", error));
}

function mostrarProductosEnPantalla(productos) {
  const contenedor = document.getElementById("productos-container");
  contenedor.innerHTML = "";

  // Obtiene el usuario actual
  const cliente = getClienteActual();
  const esAdmin = cliente && cliente.rol && cliente.rol.toUpperCase() === "ADMIN";

  productos.forEach((producto) => {
    contenedor.innerHTML += `
      <div class="card" style="width: 18rem;">
        <div class="card-body">
          <h5 class="card-title">${producto.nombre}</h5>
          <p class="card-text">${producto.descripcion}</p>
          <p class="card-text">Categoría: ${producto.categoria}</p>
          <p class="card-text">Precio: $${producto.precio}</p>
          <p class="card-text">Stock: ${producto.stock}</p>
          <button class="btn btn-primary" onclick="agregarAlCarrito(${producto.id}, '${producto.nombre}', '${producto.precio}')">Agregar al carrito</button>
          ${esAdmin ? `<button class="btn btn-danger ms-2" onclick="eliminarProducto(${producto.id})">Eliminar</button>` : ""}
          </div>
      </div>
    `;
  });
}

function agregarAlCarrito(id, nombre, precio) {
  let carrito = obtenerCarrito();
  const existente = carrito.find((item) => item.id === id);
  if (existente) {
    existente.cantidad++;
  } else {
    carrito.push({ id, nombre, precio, cantidad: 1 });
  }
  guardarCarrito(carrito);
  actualizarCarrito();
}

//Funcion eliminar producto
function eliminarProducto(id){
  if (!confirm("Seguro que deseas eliminar este producto?")) return;
  fetch(`http://localhost:8080/api/productos/${id}`, {
    method: "DELETE"
  })
    .then(res => {
      if (!res.ok) throw new Error("No se pudo eliminar el producto");
      alert("Producto eliminado correctamente");
      cargarProductosDesdeAPI();
    })
    .catch(err => alert(err.message));
}

function actualizarCarrito() {
  const carrito = obtenerCarrito();
  const contenedor = document.getElementById("carrito-items");
  const total = document.getElementById("carrito-total");
  const contador = document.getElementById("cart-counter");

  contenedor.innerHTML = "";
  let totalPrecio = 0;
  let totalCantidad = 0;

  carrito.forEach((item) => {
    contenedor.innerHTML += `
      <li class="card list-group-item d-flex justify-content-between align-items-center">
        ${item.nombre} x${item.cantidad} - $${item.precio * item.cantidad}
      </li>
    `;
    totalPrecio += item.precio * item.cantidad;
    totalCantidad += item.cantidad;
  });

  total.textContent = `$${totalPrecio.toFixed(2)}`;
  contador.textContent = totalCantidad;
}

document.getElementById("vaciar-carrito").addEventListener("click", () => {
  localStorage.removeItem("carrito");
  actualizarCarrito();
});

document.getElementById("realizar-pedido").addEventListener("click", () => {
  const carrito = obtenerCarrito();
  if (carrito.length === 0) return alert("El carrito está vacío.");

  const productos = carrito.map((item) => ({ id: item.id, cantidad: item.cantidad }));
  const cliente = getClienteActual(); // <-- obtiene el usuario logueado
  console.log(getClienteActual())

  fetch("http://localhost:8080/api/order/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ productos, client: { email: cliente.email } }) // <-- agrega el cliente
  })
    .then((res) => {
      if (!res.ok) throw new Error("Error al realizar el pedido");
      return res.json();
    })
    .then(() => {
      alert("Pedido realizado con éxito");
      localStorage.removeItem(getCarritoKey());
      actualizarCarrito();
      cargarHistorialDePedidos();
    })
    .catch((err) => alert(err.message));
});

function cargarHistorialDePedidos() {
  const cliente = getClienteActual();
  if (!cliente) {
    return;
  }
  fetch("http://localhost:8080/api/order/dto")
    .then((res) => {
      if (!res.ok) throw new Error("Error al cargar los pedidos");
      return res.json();
    })
    .then((pedidos) => {
      const contenedor = document.getElementById("lista-pedidos");
      contenedor.innerHTML = "";

      // Filtra pedidos si es usuario normal
      let pedidosAMostrar = pedidos;
      if (!cliente.rol || cliente.rol.toLowerCase() !== "admin") {
        pedidosAMostrar = pedidos.filter(p => p.client && p.client.id === cliente.id);
      }

      if (pedidosAMostrar.length === 0) {
        contenedor.innerHTML = "<p>No hay pedidos realizados.</p>";
        return;
      }

      pedidosAMostrar.forEach((pedido) => {
        const productosHTML = pedido.productos.map(p => `
          <li>${p.nombre} x${p.cantidad} - $${(p.precio * p.cantidad).toFixed(2)}</li>
        `).join("");

        contenedor.innerHTML += `
          <div class="card my-3">
            <div class="card-body">
              <h5 class="card-title">Pedido #${pedido.id}</h5>
              <p class="card-text">Fecha: ${new Date(pedido.fecha).toLocaleDateString()}</p>
              <p class="card-text">Estado: ${pedido.estado}</p>
              ${cliente.rol.toLowerCase() === "admin" && pedido.client ? `<p class="card-text">Cliente: ${pedido.client.nombre} (${pedido.client.email})</p>` : ""}
              <ul>${productosHTML}</ul>
              <p class="card-text fw-bold">Total: $${pedido.total.toFixed(2)}</p>
            </div>
          </div>
        `;
      });
    })
    .catch((err) => {
      console.error("Error al cargar historial de pedidos:", err);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  actualizarCarrito();
  cargarHistorialDePedidos();
});

document.getElementById("form-agregar-producto").addEventListener("submit", function (e) {
    e.preventDefault();

    // Obtener los valores del formulario
    const producto = {
        nombre: document.getElementById("nombre").value,
        descripcion: document.getElementById("descripcion").value,
        precio: parseFloat(document.getElementById("precio").value),
        categoria: document.getElementById("categoria").value,
        stock: parseInt(document.getElementById("stock").value)
    };

    fetch("http://localhost:8080/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(producto)
    })
    .then(res => {
        if (!res.ok) throw new Error("Error al agregar producto");
        return res.json();
    })
    .then(producto => {
        alert("Producto agregado correctamente");
        this.reset();
        cargarProductosDesdeAPI();
    })
    .catch(err => {
        alert(err.message);
        console.error("Error:", err);
    });
});


// Mostrar/ocultar formularios
document.getElementById("show-register").onclick = function(e) {
  e.preventDefault();
  document.getElementById("login-section").style.display = "none";
  document.getElementById("register-section").style.display = "block";
};
document.getElementById("show-login").onclick = function(e) {
  e.preventDefault();
  document.getElementById("register-section").style.display = "none";
  document.getElementById("login-section").style.display = "block";
};

// Login
document.getElementById("login-form").addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  fetch("http://localhost:8080/api/client/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
    .then(res => {
      if (!res.ok) throw new Error("Email o contraseña incorrectos");
      return res.json();
    })
    .then(cliente => {
      // Limpia todos los carritos de otros usuarios
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("carrito_")) localStorage.removeItem(key);
      });

      localStorage.setItem("cliente", JSON.stringify(cliente));
      document.getElementById("auth-overlay").style.display = "none";
      document.body.classList.add("logueado");

      // Carga el carrito e historial del usuario actual
      actualizarCarrito();
      cargarHistorialDePedidos();
      mostrarSeccionesPorRol();
    })
    .catch(err => alert(err.message));
});

// Registro
document.getElementById("register-form").addEventListener("submit", function(e) {
  e.preventDefault();
  const nombre = document.getElementById("register-nombre").value;
  const apellido = document.getElementById("register-apellido").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  fetch("http://localhost:8080/api/client/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, apellido, email, password })
  })
    .then(res => {
      if (!res.ok) throw new Error("No se pudo registrar el cliente");
      return res.json();
    })
    .then(cliente => {
      alert("Registro exitoso. Ahora puedes iniciar sesión.");
      document.getElementById("register-section").style.display = "none";
      document.getElementById("login-section").style.display = "block";
    })
    .catch(err => alert(err.message));
});

document.querySelector('a[href="#auth-overlay"]').addEventListener("click", function(e) {
  e.preventDefault();
  localStorage.removeItem("cliente");
  document.getElementById("auth-overlay").style.display = "flex";
  document.body.classList.remove("logueado");
  // Opcional: limpia los campos de login
  document.getElementById("login-form").reset();
  document.getElementById("register-form").reset();
  document.getElementById("register-section").style.display = "none";
  document.getElementById("login-section").style.display = "block";
});

// Si ya está logueado, muestra la página
window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("cliente")) {
    document.getElementById("auth-overlay").style.display = "none";
    document.body.classList.add("logueado");
    mostrarSeccionesPorRol();
  }
});

function getClienteActual() {
  return JSON.parse(localStorage.getItem("cliente"));
}

function getCarritoKey() {
  const cliente = getClienteActual();
  return cliente ? `carrito_${cliente.email}` : "carrito";
}

function guardarCarrito(carrito) {
  localStorage.setItem(getCarritoKey(), JSON.stringify(carrito));
}

function obtenerCarrito() {
  return JSON.parse(localStorage.getItem(getCarritoKey())) || [];
}

function mostrarSeccionesPorRol() {
  const cliente = getClienteActual();
  const seccionAdmin = document.getElementById("formulario-admin");
  if (!cliente || !seccionAdmin) return;

  if (cliente.rol && cliente.rol.toUpperCase() === "ADMIN") {
    document.getElementById("formulario-admin").style.display = "block";
  } else {
    document.getElementById("formulario-admin").style.display = "none";
  }
}


