# HomePage
Custom webpage with bookmarks. 

Source: [tilde-enhanced](https://github.com/Ozencb/tilde-enhanced)

[![Netlify Status](https://api.netlify.com/api/v1/badges/22ef7c87-8997-42dc-83fe-a2f726e66156/deploy-status)](https://app.netlify.com/sites/launchpage/deploys)

## Usage

### I am already running a server
If you already have a webserver, copy or link the contents of the /static
folder to the folder that you serve. For example,
 * cp <root-project-folder>/static /var/www/homepage

After that if you are running ngninx you can use the /nginx/home.conf file
as a starting point to create a site. 
Modify the server-name (for example to a subdomain - home.my_sever_name)
and the root to point to the right folder. 

### I am not running a server
If you dont have a webserver and you are running a system with
systemd, you can use the `homepage.service` file to create a service
that uses the nodejs' `http-server` module to serve the files on localhost:8080.
 * Install nodejs and npm
 * Install http-server (npm install http-server)
 * Edit the paths in the Exec-start line of the homepage.service file
 * Copy homepage.service to ~/.config/systemd/user/
 * Start and enable service 
 (systemctl --user start homepage; systemctl --user enable homepage)
 * Test the page: http://127.0.0.1:8080
 * Set the home and new tab page in your browser to point to http://127.0.0.1:8080
 
Refer to [tilde-enhanced](https://github.com/Ozencb/tilde-enhanced) for instructions
on how to edit the page.

