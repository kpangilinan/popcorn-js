// PLUGIN: CANDY
(function (Popcorn) {
	/**
 	* Candy popcorn plug-in
 	* DESCRIPTION
 	*
 	* @param {Object} options
 	*
 	* Example:
 	var p = Popcorn('#video')
 	.candy({
 	id: "video",
 	start: 5, // seconds
 	end: 15, // seconds
 	target : 'candydiv',
 	effect: '[effect]|[options]' // select effect
 	} )
 	*
 	*/
	var p;
	var videoB;
	var canvas, videoOut;
	var bgCanvas, bgContext;

	var frame;
	var effect;

	var r, g, b;
	var l;

	var w, h;

	//used in Multi-Channel effect
	var posX, posY, multiON = false;

	//used in Modulate effect
	var trap = 0;
	var z = 0;

	//used in Pointillize effect
	var size;
	var spacing;
	var jitter;

	//used in Pointillize/Noise/OldTV effect
	var j1;
	var j2;

	canvas = document.createElement('canvas');
	videoOut = canvas.getContext('2d');

	bgCanvas = document.createElement('canvas');
	bgContext = bgCanvas.getContext('2d');

	videoB = document.createElement('video');
	videoB.src = null;
	videoB.autoplay = "autoplay";
	videoB.loop = "loop";
	videoB.volume = 0;
	videoB.style.display = "none";

	var effectFunctions = {
		grayscale: function(c, frame) {
			for (var i = 0; i < l; i++) {
				r = frame.data[i * 4 + 0] * .3;
				g = frame.data[i * 4 + 1] * .59;
				b = frame.data[i * 4 + 2] * .11;
				var grayscale = r + g + b;

				frame.data[i * 4 + 0] = frame.data[i * 4 + 1] = frame.data[i * 4 + 2] = grayscale;
			}
			c.putImageData(frame, 0, 0);
		},
		emboss: function(c, frame) {
			// Loop through the subpixels, convoluting each using an edge-detection matrix.
			for (var i = 0; i < frame.data.length; i++) {
				if (i % 4 == 3)
					continue;
				frame.data[i] = 127 + 2 * frame.data[i] - frame.data[i + 4] - frame.data[i + frame.width * 4];
			}
			// Draw the pixels onto the visible canvas
			c.putImageData(frame, 0, 0);
		},
		rotate: function(c, frame, options, v) {
			if (options.settings.flip == 'horizontal') {
				c.scale(-1, 1);
				c.drawImage(v, -w, 0, w, h)
			} else if (options.settings.flip == 'vertical') {
				c.scale(1, -1);
				c.drawImage(v, 0, -h, w, h)
			} else if (options.settings.flip == 'horizontal-vertical' || options.settings.flip == 'vertical-horizontal') {
				c.scale(-1, -1);
				c.drawImage(v, -w, -h, w, h)
			}
				//if no option is used, video does not rotate
				c.scale(1, 1);
		},
		comic: function(c, frame, options) {
			for (var i = 0; i < l; i++) {
				r = frame.data[i * 4 + 0];
				g = frame.data[i * 4 + 1];
				b = frame.data[i * 4 + 2];
				if (options.settings.twotone == 'black-white') {
					if (g < 125 && r < 125 && b < 125) {
						frame.data[i * 4 + 0] = 0;
						frame.data[i * 4 + 1] = 0;
						frame.data[i * 4 + 2] = 0;
					} else {
						frame.data[i * 4 + 0] = 255;
						frame.data[i * 4 + 1] = 255;
						frame.data[i * 4 + 2] = 255;
					}
				} else {
					if (g < 125 && r < 125 && b < 125) {
						frame.data[i * 4 + 0] = 0;
						frame.data[i * 4 + 1] = 0;
						frame.data[i * 4 + 2] = 0;
					}
					if (g >= 125 && r >= 125 && b >= 125) {
						frame.data[i * 4 + 0] = 255;
						frame.data[i * 4 + 1] = 255;
						frame.data[i * 4 + 2] = 255;
					}
				} //DEFAULT: NORMAL COMIC
			}
			c.putImageData(frame, 0, 0);
		},
		sepia: function(c, frame) {
			for (var i = 0; i < l; i++) {
				r = frame.data[i * 4 + 0];
				g = frame.data[i * 4 + 1];
				b = frame.data[i * 4 + 2];

				frame.data[i * 4 + 0] = (r * .393) + (g * .769) + (b * .189);
				frame.data[i * 4 + 1] = (r * .349) + (g * .686) + (b * .168);
				frame.data[i * 4 + 2] = (r * .272) + (g * .354) + (b * .131);
			}
			c.putImageData(frame, 0, 0);
		},
		greenscreen: function(c, frame, options) {
			for (var i = 0; i < l; i++) {
				r = frame.data[i * 4 + 0];
				g = frame.data[i * 4 + 1];
				b = frame.data[i * 4 + 2];
				if (g > 100 && r > 100 && b < 43)
					frame.data[i * 4 + 3] = 0;
			}

			c.putImageData(frame, 0, 0);
			var imgURL = 'url(' + options.settings.url + ')';
			canvas.style.backgroundImage = imgURL;
		},
		blur: function(c, v) {
			c.globalAlpha = 0.05;
			c.drawImage(v, 0, 0, w, h);
			c.globalAlpha = 1;
		},
		divide: function(c, frame, options, v) {
			var a = w / options.settings.divisor;
			var b = h / options.settings.divisor;
			for (var x = 0; x < options.settings.divisor; x++) {
				for (var y = 0; y < options.settings.divisor; y++) {
					c.drawImage(v, x * a, y * b, a, b);
				}
			}
		},
		multichannel: function(c, frame, options, v) {
			if (multiON == false) {
				videoB.src = options.settings.url;
				multiON = true;
			}
			if (options.settings.position == "top-right") {
				posX = w / 2;
				posY = 0;
			} else if (options.settings.position == "bottom-left") {
				posX = 0;
				posY = h / 2;
			} else if (options.settings.position == "bottom-right") {
				posX = w / 2;
				posY = h / 2;
			} else {
				posX = 0;
				posY = 0;
			}
			c.drawImage(v, 0, 0, w, h);
			c.drawImage(videoB, posX, posY, w / 2, h / 2);
		},
		negative: function(c, frame) {
			for (var i = 0; i < l; i++) {
				r = frame.data[i * 4 + 0];
				g = frame.data[i * 4 + 1];
				b = frame.data[i * 4 + 2];

				frame.data[i * 4 + 0] = 255 - r;
				frame.data[i * 4 + 1] = 255 - g;
				frame.data[i * 4 + 2] = 255 - b;
			}
			c.putImageData(frame, 0, 0);
		},
		xray: function(c, frame) {
			for (var i = 0; i < l; i++) {
				r = frame.data[i * 4 + 0];
				g = frame.data[i * 4 + 1];
				b = frame.data[i * 4 + 2];

				frame.data[i * 4 + 0] = 255 - r;
				frame.data[i * 4 + 1] = 255 - g;
				frame.data[i * 4 + 2] = 255 - b;

				r = frame.data[i * 4 + 0] * .3;
				g = frame.data[i * 4 + 1] * .59;
				b = frame.data[i * 4 + 2] * .11;
				var grayscale = r + g + b;

				frame.data[i * 4 + 0] = frame.data[i * 4 + 1] = frame.data[i * 4 + 2] = grayscale;
			}
			c.putImageData(frame, 0, 0);
		},
		rgb: function(c, frame, options) {
			for (var i = 0; i < l; i++) {
				r = frame.data[i * 4 + 0] + options.settings.red;
				g = frame.data[i * 4 + 1] + options.settings.green;
				b = frame.data[i * 4 + 2] + options.settings.blue;

				frame.data[i * 4 + 0] = r;
				frame.data[i * 4 + 1] = g;
				frame.data[i * 4 + 2] = b;
			}
			c.putImageData(frame, 0, 0);
		},
		bright: function(c, frame, options) {
			for (var i = 0; i < l; i++) {
				r = frame.data[i * 4 + 0];
				g = frame.data[i * 4 + 1];
				b = frame.data[i * 4 + 2];

				r += options.settings.brightness * 20;
				g += options.settings.brightness * 20;
				b += options.settings.brightness * 20;

				frame.data[i * 4 + 0] = r;
				frame.data[i * 4 + 1] = g;
				frame.data[i * 4 + 2] = b;
			}
			c.putImageData(frame, 0, 0);
		},
		pointillize: function(c, frame, options, v, bg) {
			c.fillStyle = 'rgb(' + 255 + ',' + 255 + ',' + 255 + ')';
			c.fillRect(0, 0, w, h);

			for (var x = 0; x < w; x += options.settings.spacing) {
				for (var y = 0; y < h; y += options.settings.spacing) {
					var pixel = bg.getImageData(x, y, 1, 1);
					var color = pixel.data;
					c.fillStyle = 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';

					j1 = -options.settings.jitter + (Math.random() * (options.settings.jitter));
					j2 = -options.settings.jitter + (Math.random() * (options.settings.jitter));
					if (options.settings.shape == 'circle') {
						c.beginPath();
						c.arc(x + j1, y + j2, options.settings.size / 2, 0, Math.PI * 2, true);
						c.closePath();
						c.fill();
					} else {
						c.fillRect(x + j1, y + j2, options.settings.size, options.settings.size); //DEFAULT: rectangle
					}
				}
			}
		},
		pixelate: function(c, frame, options, v, bg) {
			for (var x = 0; x < w; x += options.settings.size) {
				for (var y = 0; y < h; y += options.settings.size) {
					var pixel = bg.getImageData(x, y, 1, 1);
					var color = pixel.data;
					c.fillStyle = 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';
					c.fillRect(x, y, options.settings.size, options.settings.size);
				}
			}
		},
		oldtv: function(c, frame) {
			for (var i = 0; i < l; i++) {
				r = frame.data[i * 4 + 0] * .3;
				g = frame.data[i * 4 + 1] * .59;
				b = frame.data[i * 4 + 2] * .11;
				var grayscale = r + g + b;

				frame.data[i * 4 + 0] = frame.data[i * 4 + 1] = frame.data[i * 4 + 2] = grayscale;
			}
			c.putImageData(frame, 0, 0);
			for (var x = 0; x < w + 30; x += 30) {
				for (var y = 0; y < h + 30; y += 30) {
					c.fillStyle = 'rgb(0,0,0)';

					j1 = (-30) + (Math.random() * (30));
					j2 = (-30) + (Math.random() * (30));
					c.fillRect(x + j1, y + j2, 1, 1);
				}
			}
		},
		noise: function(c, frame) {
			c.drawImage(v, 0, 0, w, h);
			for (var x = 0; x < w + 20; x += 20) {
				for (var y = 0; y < h + 20; y += 20) {
					c.fillStyle = 'rgb(0,0,0)';

					j1 = (-20) + (Math.random() * (20));
					j2 = (-20) + (Math.random() * (20));
					c.fillRect(x + j1, y + j2, 1, 1);
				}
			}
		},
		modulate: function(c, frame, options, v) {
			c.globalAlpha = 0.2;

			if (options.settings.orientation == 'vertical') {
				c.drawImage(v, 0, 0, w, h);
				if (trap == 1) {
					for (var i = 0; i < w; i += options.settings.wavelength * 2) {
						c.fillRect(i, 0, wavelength, h);
					}

					z++;
					if (z == options.settings.amplitude) {
						z = 0;
						trap = 0;
					}
				} else {
					for (var i = options.settings.wavelength; i < w; i += options.settings.wavelength * 2)
						c.fillRect(i, 0, options.settings.wavelength, h);

					z++;
					if (z == options.settings.amplitude) {
						z = 0;
						trap = 1;
					}
				}
			} else { //DEFAULT: horizontal
				c.drawImage(v, 0, 0, w, h);
				if (trap == 1) {
					for (var i = 0; i < h; i += options.settings.wavelength * 2)
						c.fillRect(0, i, w, options.settings.wavelength);

					z++;
					if (z == options.settings.amplitude) {
						z = 0;
						trap = 0;
					}
				} else {
					for (var i = options.settings.wavelength; i < h; i += options.settings.wavelength * 2) 
						c.fillRect(0, i, w, options.settings.wavelength);
					z++;
					if (z == options.settings.amplitude) {
						z = 0;
						trap = 1;
					}
				}
			}

			c.globalAlpha = 1;

		}
	};

	function draw(v, c, bg, options) {
		if (v.paused || v.ended || options.stopEffect) {
			return false;
			console.log("stopped");
		}
		bg.drawImage(v, 0, 0, w, h);

		frame = bg.getImageData(0, 0, w, h);
		l = frame.data.length / 2;

		effectFunctions[options.effect](c, frame, options, v, bg);

		setTimeout(draw, 0, v, c, bg, options);
	}; //end of draw function

	Popcorn.plugin("candy", (function () {
		return {
			manifest: {
				about: {
					name: "Popcorn Candy Plugin",
					version: "0.8",
					author: "@kpangilinan",
					website: "kpangilinan.wordpress.com"
				},
				options: {
					start: {
						elem: 'input',
						type: 'text',
						label: 'In'
					},
					end: {
						elem: 'input',
						type: 'text',
						label: 'Out'
					},
					target: 'candy-container',
					effect: {
						elem: 'input',
            	        type: 'text',
                        label: 'Text'
					},
					settings: {
						divisor: 'number',
						flip: 'text',
						twotone: 'text',
						url: 'text',
						position: 'text',
						red: 'number',
						green: 'number',
						blue: 'number',
						brightness: 'number',
						size: 'number',
						spacing: 'number',
						jitter: 'number',
						shape: 'text',
						wavelength: 'number',
						amplitude: 'number',
						orientation: 'number'
					},
					stopEffect: false
				}
			},
			_setup: function (options) {
				p = this;

				w = canvas.width = bgCanvas.width = p.video.offsetWidth;
				h = canvas.height = bgCanvas.height = p.video.offsetHeight;

				p.video.style.display = "inline";
				canvas.style.display = "none";

				if (document.getElementById(options.target)) {
					document.getElementById(options.target).appendChild(p.video);
					document.getElementById(options.target).appendChild(canvas); // add the widget's div to the target div
				}
			},
			/**
 			* @member candy
 			* The start function will be executed when the currentTime
 			* of the video reaches the start time provided by the
 			* options variable
 			*/
			start: function (event, options) {
				p.video.style.display = "none";
				canvas.style.display = "inline";
				options.stopEffect = false;

				//alert(options.stopEffect);
				draw(p.video, videoOut, bgContext, options); //continue to draw() until video has paused or ended
			},
			/**
 			* @member candy
 			* The end function will be executed when the currentTime
 			* of the video reaches the end time provided by the
 			* options variable
 			*/
			end: function (event, options) {
				p.video.style.display = "inline";
				canvas.style.display = "none";
				options.stopEffect = true, multiON = false;
			}
		};
	})());
})(Popcorn);