import https from "https";
import fs from "fs";
import expressAsyncHandler from "express-async-handler";


const BASE_HOSTNAME = "storage.bunnycdn.com";
const HOSTNAME = BASE_HOSTNAME;
const ACCESS_KEY = "2f7fcf6d-e24b-4303-b2432e48c149-da1c-4134";
const STORAGE_ZONE_NAME = "mve-storage-ecom";

export const uploadFile = expressAsyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file attached");
    }

    const file = req.file;
    const filePath = file.path;
    const fileName = encodeURIComponent(file.originalname);

    const readStream = fs.createReadStream(filePath);

    const options = {
        method: "PUT",
        hostname: HOSTNAME,
        path: `/${STORAGE_ZONE_NAME}/${fileName}`, // Ensure proper path format
        headers: {
            AccessKey: ACCESS_KEY,
            "Content-Type": "application/octet-stream",
        },
    };

    const reqBunny = https.request(options, (response) => {
        let responseBody = "";

        response.on("data", (chunk) => {
            responseBody += chunk;
        });

        response.on("end", () => {
            if (response.statusCode === 201 || response.statusCode === 200) {
                // File uploaded successfully
                fs.unlink(filePath, (err) => {
                    if (err){
                        console.error("Error in removing file:", err);
                    } else {
                        console.log("File removed successfully");
                    }    
                });

                res.status(201).json({
                    status: true,
                    msg: "File uploaded successfully",
                    path: `${STORAGE_ZONE_NAME}/${fileName}`,
                });
            } else {
                // Handle upload failure
                console.error("File upload failed", responseBody);
                res.status(response.statusCode).json({
                    status: false,
                    msg: "File upload failed",
                    response: responseBody,
                });
            }
        });
    });

    reqBunny.on("error", (error) => {
        console.error("Error during upload:", error);
        fs.unlink(filePath, (err) => {
            if (err) console.error("Error in removing file:", err);
        });
         res.status(500).json({
            status: false,
            msg: "File upload failed",
            error: error.message, 
        });
    });

    readStream.pipe(reqBunny);
});

export const deleteFile = expressAsyncHandler(async (req, res) => {
    const url = `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${req.params.fileName}`;
    const options = {
        method: "DELETE",
        headers: {
            AccessKey: ACCESS_KEY,
        }
    };

    try {
        const response = await fetch(url, options);
        if(response.ok) {
            res.status(200).json({ status: true, msg: "File Deleted Successfully"});
        }else {
            const errorText = await response.text();
            res.status(response.status)
            .json({ status: false, msg: `Error in deleting file: ${errorText}`})
        }
    }catch(error) {
        res.status(500).json({ status: false, msg: `Error in deleting file`})
    }
})
